/** Moteur de lecture et d'export du montage (navigateur uniquement) : canvas 720×1280 + Web Audio. */
import {
  clipLength, coverRect, filterCss, locate, motionAt, overlayAlpha, pickRecorderMime, totalLength,
  TRANSITION_SECONDS, type Clip,
} from "./editor-rules";

export const OUT_W = 720;
export const OUT_H = 1280;

export type VoiceEffect = "aucun" | "grave" | "aigue" | "robot" | "echo" | "radio";
export const VOICE_EFFECT_LABELS: Record<VoiceEffect, string> = {
  aucun: "Naturelle", grave: "Grave", aigue: "Aiguë", robot: "Robot", echo: "Écho", radio: "Radio",
};

export interface Overlay {
  id: string;
  kind: "texte" | "sous-titre" | "sticker";
  content: string;
  start: number;
  end: number;
  x: number; // 0…1
  y: number;
  size: number; // px sur 1280
  color: string;
  animated: boolean;
}

export interface AudioTrack {
  id: string;
  kind: "musique" | "voix";
  src: string;
  name: string;
  at: number; // début sur la timeline
  volume: number;
  effect: VoiceEffect;
}

export interface Project {
  clips: Clip[];
  overlays: Overlay[];
  tracks: AudioTrack[];
  originalVolume: number;
}

function drawOverlay(ctx: CanvasRenderingContext2D, o: Overlay, t: number) {
  const alpha = overlayAlpha(t, o.start, o.end, o.animated);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = o.x * OUT_W;
  const y = o.y * OUT_H;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (o.kind === "sticker") {
    ctx.font = `${o.size}px sans-serif`;
    ctx.fillText(o.content, x, y);
  } else {
    ctx.font = `${o.kind === "texte" ? 800 : 600} ${o.size}px system-ui, sans-serif`;
    const lines = o.content.split("\n");
    lines.forEach((line, i) => {
      const ly = y + (i - (lines.length - 1) / 2) * o.size * 1.2;
      if (o.kind === "sous-titre") {
        const w = ctx.measureText(line).width + o.size;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x - w / 2, ly - o.size * 0.65, w, o.size * 1.3);
      } else {
        ctx.lineWidth = Math.max(3, o.size / 8);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.strokeText(line, x, ly);
      }
      ctx.fillStyle = o.color;
      ctx.fillText(line, x, ly);
    });
  }
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: Clip["effect"], t: number) {
  if (effect === "vignette") {
    const g = ctx.createRadialGradient(OUT_W / 2, OUT_H / 2, OUT_H * 0.25, OUT_W / 2, OUT_H / 2, OUT_H * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
  } else if (effect === "lignes") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = (t * 40) % 6; y < OUT_H; y += 6) ctx.fillRect(0, y, OUT_W, 2);
  } else if (effect === "lueur") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(0, 0, OUT_W, OUT_H);
    const k = 0.18 + 0.1 * Math.sin(t * 2);
    g.addColorStop(0, `rgba(255,140,60,${k})`);
    g.addColorStop(1, `rgba(120,80,255,${k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.restore();
  }
}

/** Dessine une image de la timeline à partir de la vidéo du clip déjà positionnée. */
export function drawFrame(ctx: CanvasRenderingContext2D, project: Project, t: number, video: HTMLVideoElement | undefined, index: number, local: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  const clip = project.clips[index];
  if (clip && video && video.videoWidth) {
    const len = clipLength(clip) || 1;
    const m = motionAt(clip, local / len);
    const tr = index > 0 && local < TRANSITION_SECONDS ? local / TRANSITION_SECONDS : 1;
    const zoom = m.zoom * (clip.transition === "zoom" ? 1 + 0.35 * (1 - tr) : 1);
    const r = coverRect(video.videoWidth, video.videoHeight, OUT_W, OUT_H, zoom, m.pan);
    ctx.save();
    ctx.filter = filterCss(clip.filter, clip.adjust);
    if (clip.transition === "fondu") ctx.globalAlpha = tr;
    if (clip.transition === "glissement") ctx.translate((1 - tr) * OUT_W, 0);
    if (clip.effect === "miroir") {
      ctx.translate(OUT_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, r.x, r.y, r.w, r.h);
    ctx.restore();
    drawEffect(ctx, clip.effect, t);
  }
  for (const o of project.overlays) drawOverlay(ctx, o, t);
}

function buildVoiceChain(ac: AudioContext, input: AudioNode, effect: VoiceEffect): AudioNode {
  if (effect === "robot") {
    const ring = ac.createGain();
    ring.gain.value = 0;
    const osc = ac.createOscillator();
    osc.frequency.value = 55;
    osc.connect(ring.gain);
    osc.start();
    input.connect(ring);
    return ring;
  }
  if (effect === "echo") {
    const out = ac.createGain();
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.28;
    const fb = ac.createGain();
    fb.gain.value = 0.4;
    input.connect(out);
    input.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(out);
    return out;
  }
  if (effect === "radio") {
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 1.2;
    input.connect(bp);
    return bp;
  }
  return input;
}

export class TimelineEngine {
  private videos = new Map<string, HTMLVideoElement>();
  private audios = new Map<string, HTMLAudioElement>();
  private gains = new Map<string, GainNode>();
  private ac: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private raf = 0;
  private running = false;
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private getProject: () => Project) {
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    this.ctx = canvas.getContext("2d")!;
  }

  private video(clip: Clip): HTMLVideoElement {
    let v = this.videos.get(clip.src);
    if (!v) {
      v = document.createElement("video");
      v.src = clip.src;
      v.playsInline = true;
      v.preload = "auto";
      this.videos.set(clip.src, v);
    }
    return v;
  }

  private audioCtx() {
    if (!this.ac) {
      this.ac = new AudioContext();
      this.dest = this.ac.createMediaStreamDestination();
    }
    void this.ac.resume();
    return this.ac;
  }

  /** Branche un élément média une seule fois dans le mixeur (haut-parleur + export). */
  private route(key: string, el: HTMLMediaElement, effect: VoiceEffect = "aucun"): GainNode {
    const ac = this.audioCtx();
    const k = `${key}:${effect}`;
    let g = this.gains.get(k);
    if (!g) {
      const src = ac.createMediaElementSource(el);
      g = ac.createGain();
      buildVoiceChain(ac, src, effect).connect(g);
      g.connect(ac.destination);
      g.connect(this.dest!);
      this.gains.set(k, g);
    }
    return g;
  }

  private audio(track: AudioTrack): HTMLAudioElement {
    const key = `${track.id}:${track.effect}`;
    let a = this.audios.get(key);
    if (!a) {
      a = new Audio(track.src);
      a.preload = "auto";
      this.audios.set(key, a);
    }
    const rate = track.effect === "grave" ? 0.8 : track.effect === "aigue" ? 1.35 : 1;
    a.playbackRate = rate;
    (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = rate === 1;
    return a;
  }

  private seekVideo(v: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const go = () => {
        if (Math.abs(v.currentTime - time) < 0.02 && v.readyState >= 2) return resolve();
        const done = () => resolve();
        v.addEventListener("seeked", done, { once: true });
        setTimeout(done, 1500);
        v.currentTime = time;
      };
      if (v.readyState >= 1) go();
      else v.addEventListener("loadedmetadata", go, { once: true });
    });
  }

  /** Affiche l'image fixe au temps t. */
  async preview(t: number) {
    const p = this.getProject();
    const at = locate(p.clips, t);
    if (!at) return drawFrame(this.ctx, p, t, undefined, 0, 0);
    const clip = p.clips[at.index]!;
    const v = this.video(clip);
    await this.seekVideo(v, Math.min(clip.end - 0.05, clip.start + at.local * clip.speed));
    drawFrame(this.ctx, p, t, v, at.index, at.local);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.videos.forEach((v) => v.pause());
    this.audios.forEach((a) => a.pause());
  }

  /** Lit la timeline depuis `from` ; avec `record`, renvoie le fichier exporté. */
  async play(from: number, opts: { record?: boolean; onTime?: (t: number) => void } = {}): Promise<File | null> {
    this.stop();
    const p = this.getProject();
    const total = totalLength(p.clips);
    if (!p.clips.length || total <= 0) return null;
    this.audioCtx();
    this.running = true;

    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let mime = "";
    if (opts.record) {
      mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      if (!mime) throw new Error("Votre navigateur ne permet pas d'exporter une vidéo.");
      const stream = this.canvas.captureStream(30);
      this.dest!.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.start(500);
    }

    const startedTracks = new Set<string>();
    const syncTracks = (t: number) => {
      for (const tr of p.tracks) {
        const a = this.audio(tr);
        const g = this.route(`a:${tr.id}`, a, tr.effect);
        g.gain.value = tr.volume;
        if (!startedTracks.has(tr.id) && t >= tr.at) {
          startedTracks.add(tr.id);
          a.currentTime = Math.max(0, (t - tr.at) * a.playbackRate);
          void a.play().catch(() => {});
        }
      }
    };

    let t = from;
    let at = locate(p.clips, from)!;
    for (let i = at.index; i < p.clips.length && this.running; i++) {
      const clip = p.clips[i]!;
      const offset = i === at.index ? at.offset : t;
      const local = i === at.index ? at.local : 0;
      const v = this.video(clip);
      const g = this.route(`v:${clip.src}`, v);
      g.gain.value = p.originalVolume;
      await this.seekVideo(v, clip.start + local * clip.speed);
      v.playbackRate = clip.speed;
      await v.play().catch(() => {});
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (!this.running) return resolve();
          const l = (v.currentTime - clip.start) / clip.speed;
          t = offset + Math.min(l, clipLength(clip));
          syncTracks(t);
          drawFrame(this.ctx, p, t, v, i, Math.max(0, l));
          opts.onTime?.(t);
          if (v.currentTime >= clip.end - 0.04 || v.ended) {
            v.pause();
            t = offset + clipLength(clip);
            return resolve();
          }
          this.raf = requestAnimationFrame(tick);
        };
        tick();
      });
      at = { index: -1, offset: 0, local: 0 };
    }
    const finished = this.running;
    this.stop();
    if (!recorder) return null;
    await new Promise<void>((r) => {
      recorder!.onstop = () => r();
      recorder!.stop();
    });
    if (!finished) return null;
    const base = mime.split(";")[0]!;
    return new File(chunks, `panu-montage-${Date.now()}.${base === "video/mp4" ? "mp4" : "webm"}`, { type: base });
  }

  dispose() {
    this.stop();
    this.videos.forEach((v) => v.removeAttribute("src"));
    void this.ac?.close();
  }
}

/** Charge la durée d'une vidéo importée (certains fichiers WebM annoncent Infinity). */
export function readVideoDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onerror = () => reject(new Error("Cette vidéo ne peut pas être lue par votre navigateur."));
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) return resolve(v.duration);
      v.currentTime = 1e7;
      v.ontimeupdate = () => {
        v.ontimeupdate = null;
        resolve(v.duration);
      };
    };
    v.src = src;
  });
}

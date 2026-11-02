/**
 * Montage du clip musical vertical, entièrement dans le navigateur de l'utilisateur :
 * le rythme du morceau est analysé, les photos / vidéos changent sur les temps forts,
 * puis l'image (720×1280) et le son sont enregistrés ensemble. Rien n'est envoyé tant que l'utilisateur ne publie pas.
 */
import {
  beatPulse,
  CLIP_FPS,
  CLIP_HEIGHT,
  CLIP_MAX_SECONDS,
  CLIP_WIDTH,
  detectBeats,
  fallbackBeats,
  pickRecorderMime,
  planSegments,
  type ClipMediaKind,
} from "./music-clip-rules";

export type ClipSource = { file: File; kind: ClipMediaKind };
export type ClipResult = { blob: Blob; mime: string; duration: number; beats: number };

type Loaded = { kind: "image"; img: ImageBitmap } | { kind: "video"; video: HTMLVideoElement; url: string };

async function loadSource(s: ClipSource): Promise<Loaded> {
  if (s.kind === "image") {
    try {
      return { kind: "image", img: await createImageBitmap(s.file) };
    } catch {
      throw new Error(`Photo illisible : ${s.file.name}`);
    }
  }
  const url = URL.createObjectURL(s.file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.loop = true;
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error(`Vidéo illisible : ${s.file.name}`));
  });
  return { kind: "video", video, url };
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, zoom: number, drift: number) {
  const scale = Math.max(CLIP_WIDTH / sw, CLIP_HEIGHT / sh) * zoom;
  const w = sw * scale;
  const h = sh * scale;
  const x = (CLIP_WIDTH - w) / 2 + drift * (w - CLIP_WIDTH) * 0.5;
  const y = (CLIP_HEIGHT - h) / 2;
  ctx.drawImage(src, x, y, w, h);
}

function frameOf(l: Loaded): { src: CanvasImageSource; w: number; h: number } {
  if (l.kind === "image") return { src: l.img, w: l.img.width, h: l.img.height };
  return { src: l.video, w: l.video.videoWidth || CLIP_WIDTH, h: l.video.videoHeight || CLIP_HEIGHT };
}

/** Décode le morceau et repère ses temps forts. */
export async function analyzeSong(audio: Blob): Promise<{ buffer: AudioBuffer; beats: number[]; duration: number }> {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
    const duration = Math.min(buffer.duration, CLIP_MAX_SECONDS);
    const ch0 = buffer.getChannelData(0);
    const mono = new Float32Array(Math.floor(duration * buffer.sampleRate));
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    for (let i = 0; i < mono.length; i++) mono[i] = ch1 ? ((ch0[i] as number) + (ch1[i] as number)) / 2 : (ch0[i] as number);
    let beats = detectBeats(mono, buffer.sampleRate);
    if (beats.length < duration / 4) beats = fallbackBeats(duration);
    return { buffer, beats, duration };
  } catch {
    throw new Error("Ce morceau n'a pas pu être lu par votre téléphone.");
  } finally {
    void ctx.close();
  }
}

/**
 * Enregistre le clip en temps réel (durée du morceau, 60 s maximum).
 * Gardez la page ouverte : un onglet en arrière-plan ralentit ou interrompt l'enregistrement.
 */
export async function renderMusicClip(opts: {
  audio: Blob;
  media: ClipSource[];
  title?: string;
  onProgress?: (ratio: number, label: string) => void;
  signal?: AbortSignal;
}): Promise<ClipResult> {
  if (typeof MediaRecorder === "undefined") throw new Error("Votre navigateur ne permet pas d'enregistrer un clip.");
  const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("Votre navigateur ne sait pas enregistrer de vidéo. Essayez Chrome ou Safari à jour.");
  if (opts.media.length === 0) throw new Error("Ajoutez au moins une photo ou une vidéo.");

  opts.onProgress?.(0, "Analyse du rythme…");
  const { buffer, beats, duration } = await analyzeSong(opts.audio);
  const segments = planSegments(beats, duration, opts.media.length);
  opts.onProgress?.(0, "Préparation des images…");
  const loaded: Loaded[] = [];
  try {
    for (const m of opts.media) loaded.push(await loadSource(m));

    const canvas = document.createElement("canvas");
    canvas.width = CLIP_WIDTH;
    canvas.height = CLIP_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Montage impossible sur cet appareil.");

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(dest);
    const stream = canvas.captureStream(CLIP_FPS);
    for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    let current = -1;
    let aborted = false;
    const draw = (t: number) => {
      const idx = Math.max(0, segments.findIndex((s) => t >= s.start && t < s.end));
      const seg = segments[idx] ?? segments[segments.length - 1];
      if (!seg) return;
      if (idx !== current) {
        current = idx;
        const l = loaded[seg.media];
        if (l?.kind === "video") {
          l.video.currentTime = 0;
          void l.video.play().catch(() => undefined);
        }
      }
      const local = (t - seg.start) / Math.max(0.01, seg.end - seg.start);
      const pulse = beatPulse(t, beats);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CLIP_WIDTH, CLIP_HEIGHT);
      const l = loaded[seg.media] as Loaded;
      const f = frameOf(l);
      drawCover(ctx, f.src, f.w, f.h, 1.04 + local * 0.1 + pulse * 0.035, (seg.media % 2 ? -1 : 1) * (local - 0.5) * 0.4);
      // Fondu d'entrée de chaque plan et éclair léger sur les temps forts.
      const fade = Math.max(0, 1 - (t - seg.start) / 0.18);
      if (fade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fade * 0.85})`;
        ctx.fillRect(0, 0, CLIP_WIDTH, CLIP_HEIGHT);
      }
      if (pulse > 0) {
        ctx.fillStyle = `rgba(255,255,255,${pulse * 0.08})`;
        ctx.fillRect(0, 0, CLIP_WIDTH, CLIP_HEIGHT);
      }
      const grad = ctx.createLinearGradient(0, CLIP_HEIGHT * 0.7, 0, CLIP_HEIGHT);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, CLIP_HEIGHT * 0.7, CLIP_WIDTH, CLIP_HEIGHT * 0.3);
      if (opts.title && t < 3.5) {
        ctx.globalAlpha = Math.min(1, t / 0.4, (3.5 - t) / 0.5);
        ctx.fillStyle = "#fff";
        ctx.font = "700 46px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(opts.title.slice(0, 32), CLIP_WIDTH / 2, CLIP_HEIGHT - 150);
        ctx.globalAlpha = 1;
      }
    };

    draw(0);
    recorder.start(1000);
    const startAt = audioCtx.currentTime + 0.05;
    source.start(startAt);
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (opts.signal?.aborted) {
          aborted = true;
          return resolve();
        }
        const t = audioCtx.currentTime - startAt;
        if (t >= duration) return resolve();
        if (t >= 0) {
          draw(t);
          opts.onProgress?.(t / duration, "Enregistrement du clip…");
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    source.stop();
    recorder.stop();
    await stopped;
    void audioCtx.close();
    if (aborted) throw new Error("Montage annulé.");

    let blob = new Blob(chunks, { type: mime.split(";")[0] ?? "video/webm" });
    if (blob.type === "video/webm") {
      // L'enregistreur WebM n'inscrit pas la durée : on la corrige pour que la lecture et l'avance rapide fonctionnent.
      const { default: fixWebmDuration } = await import("fix-webm-duration");
      blob = await fixWebmDuration(blob, duration * 1000, { logger: false });
    }
    if (blob.size === 0) throw new Error("Le clip enregistré est vide. Réessayez en gardant la page ouverte.");
    opts.onProgress?.(1, "Clip prêt");
    return { blob, mime: blob.type, duration, beats: beats.length };
  } finally {
    for (const l of loaded) {
      if (l.kind === "video") {
        l.video.pause();
        URL.revokeObjectURL(l.url);
      } else l.img.close();
    }
  }
}

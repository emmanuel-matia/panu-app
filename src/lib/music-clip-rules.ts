/** Règles du clip musical vertical (détection du rythme, découpage, limites) — sans dépendance navigateur. */

export const CLIP_WIDTH = 720;
export const CLIP_HEIGHT = 1280;
export const CLIP_FPS = 30;
export const CLIP_MAX_SECONDS = 60;
export const CLIP_MAX_MEDIA = 10;
export const CLIP_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const CLIP_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const CLIP_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const CLIP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const CLIP_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const CLIP_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm"];

export type ClipMediaKind = "image" | "video";

/** Vérifie un fichier ajouté au clip ; renvoie son type ou un message d'erreur. */
export function checkClipMedia(file: { type: string; size: number }): { kind: ClipMediaKind } | { error: string } {
  if (CLIP_IMAGE_TYPES.includes(file.type)) {
    if (file.size === 0) return { error: "Ce fichier est vide." };
    if (file.size > CLIP_IMAGE_MAX_BYTES) return { error: "Photo trop lourde (15 Mo maximum)." };
    return { kind: "image" };
  }
  if (CLIP_VIDEO_TYPES.includes(file.type)) {
    if (file.size === 0) return { error: "Ce fichier est vide." };
    if (file.size > CLIP_VIDEO_MAX_BYTES) return { error: "Vidéo trop lourde (50 Mo maximum)." };
    return { kind: "video" };
  }
  return { error: "Format non pris en charge : photo JPEG, PNG, WebP ou vidéo MP4, WebM, MOV." };
}

export function checkClipAudio(file: { type: string; size: number }): string | null {
  if (!CLIP_AUDIO_TYPES.includes(file.type)) return "Format audio non pris en charge (MP3, M4A, AAC, WAV, OGG).";
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > CLIP_AUDIO_MAX_BYTES) return "Fichier audio trop lourd (25 Mo maximum).";
  return null;
}

/**
 * Détecte les temps forts d'un morceau (mono) : montée brusque d'énergie au-dessus de la moyenne locale.
 * Renvoie les instants en secondes, au moins `minGap` secondes d'écart.
 */
export function detectBeats(samples: Float32Array, sampleRate: number, minGap = 0.25): number[] {
  const hop = 1024;
  const frames = Math.floor(samples.length / hop);
  if (frames < 4) return [];
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) sum += (samples[i] as number) ** 2;
    energy[f] = Math.sqrt(sum / hop);
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, (energy[f] as number) - (energy[f - 1] as number));
  const frameSec = hop / sampleRate;
  const half = Math.max(2, Math.round(0.5 / frameSec));
  const beats: number[] = [];
  let last = -Infinity;
  for (let f = 1; f < frames - 1; f++) {
    const v = flux[f] as number;
    if (v <= 0 || v < (flux[f - 1] as number) || v < (flux[f + 1] as number)) continue;
    let mean = 0;
    let n = 0;
    for (let j = Math.max(0, f - half); j <= Math.min(frames - 1, f + half); j++) {
      mean += flux[j] as number;
      n++;
    }
    mean /= n;
    if (v < mean * 1.6 + 0.004) continue;
    const t = f * frameSec;
    if (t - last < minGap) continue;
    beats.push(Number(t.toFixed(3)));
    last = t;
  }
  return beats;
}

/** Sans rythme détectable (musique calme), des repères réguliers toutes les `every` secondes. */
export function fallbackBeats(duration: number, every = 0.75): number[] {
  const out: number[] = [];
  for (let t = every; t < duration; t += every) out.push(Number(t.toFixed(3)));
  return out;
}

export type ClipSegment = { start: number; end: number; media: number };

/**
 * Découpe le clip : chaque changement d'image tombe sur un temps fort, entre `minSeg` et `maxSeg` secondes.
 * Les médias défilent dans l'ordre choisi par l'utilisateur, puis recommencent.
 */
export function planSegments(beats: number[], duration: number, mediaCount: number, minSeg = 1.4, maxSeg = 4): ClipSegment[] {
  if (mediaCount <= 0 || duration <= 0) return [];
  if (mediaCount === 1) return [{ start: 0, end: duration, media: 0 }];
  const cuts: number[] = [];
  let last = 0;
  const sorted = [...beats].filter((b) => b > 0 && b < duration).sort((a, b) => a - b);
  for (const b of sorted) {
    while (b - last > maxSeg) {
      last += maxSeg;
      cuts.push(Number(last.toFixed(3)));
    }
    if (b - last >= minSeg) {
      cuts.push(b);
      last = b;
    }
  }
  while (duration - last > maxSeg) {
    last += maxSeg;
    cuts.push(Number(last.toFixed(3)));
  }
  // Dernier plan trop court : fusionné avec le précédent.
  if (cuts.length && duration - (cuts[cuts.length - 1] as number) < 0.8) cuts.pop();
  const bounds = [0, ...cuts, duration];
  return bounds.slice(0, -1).map((start, i) => ({ start, end: bounds[i + 1] as number, media: i % mediaCount }));
}

/** Impulsion visuelle (0 à 1) juste après un temps fort, qui s'estompe en `decay` secondes. */
export function beatPulse(t: number, beats: number[], decay = 0.22): number {
  let lo = 0;
  let hi = beats.length - 1;
  let prev = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid] as number) <= t) {
      prev = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (prev < 0) return 0;
  const dt = t - (beats[prev] as number);
  return dt >= decay ? 0 : 1 - dt / decay;
}

/** Format d'enregistrement : MP4 H.264 (lisible partout, iPhone compris) quand le téléphone sait le produire, sinon WebM. */
export function pickRecorderMime(isSupported: (mime: string) => boolean): string | null {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    // Dernier recours : MP4 dont le codec est choisi par le navigateur.
    "video/mp4",
  ];
  return candidates.find((m) => isSupported(m)) ?? null;
}

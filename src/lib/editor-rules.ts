/** Règles pures du montage vidéo et de la retouche photo PANU (aucune dépendance navigateur). */

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3] as const;
export const MIN_CLIP = 0.3;
export const TRANSITION_SECONDS = 0.5;

export type Transition = "aucune" | "fondu" | "glissement" | "zoom";
export type VisualEffect = "aucun" | "vignette" | "lignes" | "lueur" | "miroir";
export type FilterId = "aucun" | "vif" | "chaud" | "froid" | "noir-blanc" | "vintage" | "drame" | "doux";

export interface Adjust {
  brightness: number; // 0.5 – 1.5
  contrast: number;
  saturation: number;
}
export const NEUTRAL_ADJUST: Adjust = { brightness: 1, contrast: 1, saturation: 1 };

export interface Clip {
  id: string;
  src: string;
  name: string;
  duration: number;
  start: number;
  end: number;
  speed: number;
  filter: FilterId;
  adjust: Adjust;
  effect: VisualEffect;
  zoomFrom: number;
  zoomTo: number;
  panFrom: number; // -1 … 1
  panTo: number;
  transition: Transition;
}

export function newClip(id: string, src: string, name: string, duration: number): Clip {
  return {
    id, src, name, duration, start: 0, end: duration, speed: 1, filter: "aucun",
    adjust: { ...NEUTRAL_ADJUST }, effect: "aucun", zoomFrom: 1, zoomTo: 1, panFrom: 0, panTo: 0, transition: "aucune",
  };
}

/** Durée d'un clip sur la timeline (vitesse incluse). */
export function clipLength(c: Pick<Clip, "start" | "end" | "speed">): number {
  return Math.max(0, (c.end - c.start) / c.speed);
}

export function totalLength(clips: readonly Clip[]): number {
  return clips.reduce((s, c) => s + clipLength(c), 0);
}

/** Clip actif et temps local (en secondes de timeline) au temps t. */
export function locate(clips: readonly Clip[], t: number): { index: number; offset: number; local: number } | null {
  let offset = 0;
  for (let i = 0; i < clips.length; i++) {
    const len = clipLength(clips[i]!);
    if (t < offset + len || i === clips.length - 1) {
      return { index: i, offset, local: Math.min(Math.max(0, t - offset), len) };
    }
    offset += len;
  }
  return null;
}

/** Divise le clip au temps de timeline t ; renvoie la liste inchangée si la coupe est trop près d'un bord. */
export function splitAt(clips: readonly Clip[], t: number, newId: string): Clip[] {
  const at = locate(clips, t);
  if (!at) return [...clips];
  const c = clips[at.index]!;
  const cut = c.start + at.local * c.speed;
  if (cut - c.start < MIN_CLIP || c.end - cut < MIN_CLIP) return [...clips];
  const first: Clip = { ...c, end: cut };
  const second: Clip = { ...c, id: newId, start: cut, transition: "aucune" };
  return [...clips.slice(0, at.index), first, second, ...clips.slice(at.index + 1)];
}

export function moveClip<T>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir;
  if (to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

/** Bornes de découpe valides (au moins MIN_CLIP secondes). */
export function clampClipTrim(start: number, end: number, duration: number): { start: number; end: number } {
  const s = Math.min(Math.max(0, start), Math.max(0, duration - MIN_CLIP));
  const e = Math.max(Math.min(duration, end), s + MIN_CLIP);
  return { start: s, end: Math.min(e, duration) };
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Zoom et panoramique progressifs ; p = avancement 0…1 dans le clip. */
export function motionAt(c: Pick<Clip, "zoomFrom" | "zoomTo" | "panFrom" | "panTo">, p: number) {
  const q = Math.min(1, Math.max(0, p));
  return { zoom: lerp(c.zoomFrom, c.zoomTo, q), pan: lerp(c.panFrom, c.panTo, q) };
}

const FILTERS: Record<FilterId, string> = {
  aucun: "",
  vif: "saturate(1.45) contrast(1.1)",
  chaud: "sepia(0.25) saturate(1.25) hue-rotate(-10deg)",
  froid: "saturate(1.1) hue-rotate(15deg) brightness(1.03)",
  "noir-blanc": "grayscale(1) contrast(1.15)",
  vintage: "sepia(0.55) contrast(0.95) brightness(1.05)",
  drame: "contrast(1.35) saturate(0.85) brightness(0.92)",
  doux: "brightness(1.08) contrast(0.9) saturate(0.9)",
};
export const FILTER_LABELS: Record<FilterId, string> = {
  aucun: "Original", vif: "Vif", chaud: "Chaud", froid: "Froid", "noir-blanc": "Noir & blanc",
  vintage: "Vintage", drame: "Drame", doux: "Doux",
};

/** Chaîne CSS `filter` (canvas) pour un filtre et des réglages. */
export function filterCss(filter: FilterId, a: Adjust, extra = ""): string {
  const parts = [FILTERS[filter]];
  if (a.brightness !== 1) parts.push(`brightness(${a.brightness})`);
  if (a.contrast !== 1) parts.push(`contrast(${a.contrast})`);
  if (a.saturation !== 1) parts.push(`saturate(${a.saturation})`);
  if (extra) parts.push(extra);
  const css = parts.filter(Boolean).join(" ");
  return css || "none";
}

/** Opacité d'un texte animé (apparition en 0,4 s) ; 0 hors de sa plage. */
export function overlayAlpha(t: number, start: number, end: number, animated: boolean): number {
  if (t < start || t > end) return 0;
  if (!animated) return 1;
  return Math.min(1, (t - start) / 0.4, (end - t) / 0.4);
}

/** Taille de rendu « couvrir » avec zoom : l'image remplit toujours le cadre. */
export function coverRect(srcW: number, srcH: number, W: number, H: number, zoom: number, panX: number, panY = 0) {
  const scale = Math.max(W / srcW, H / srcH) * Math.max(1, zoom);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (W - w) / 2 - (panX * (w - W)) / 2, y: (H - h) / 2 - (panY * (h - H)) / 2, w, h };
}

export function containRect(srcW: number, srcH: number, W: number, H: number) {
  const scale = Math.min(W / srcW, H / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/** Normalise des hashtags saisis (« afrique, #RDC musique ») en « #afrique #RDC #musique ». */
export function normalizeHashtags(input: string): string {
  const tags = input
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter(Boolean);
  return [...new Set(tags)].map((t) => `#${t}`).join(" ");
}

/** Légende publiée : description puis hashtags (lus ensuite par Découvrir). */
export function captionWithHashtags(caption: string, hashtags: string): string {
  return [caption.trim(), normalizeHashtags(hashtags)].filter(Boolean).join("\n\n");
}

/** Type MIME d'export pris en charge, MP4 d'abord (lu partout), sinon WebM. */
export function pickRecorderMime(isSupported: (m: string) => boolean): string | null {
  const list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return list.find((m) => isSupported(m)) ?? null;
}

export type PhotoAspect = "original" | "1:1" | "4:5" | "9:16" | "16:9";
export function aspectSize(aspect: PhotoAspect, srcW: number, srcH: number, maxSide: number): { w: number; h: number } {
  const ratio = aspect === "original" ? srcW / srcH : aspect === "1:1" ? 1 : aspect === "4:5" ? 4 / 5 : aspect === "9:16" ? 9 / 16 : 16 / 9;
  return ratio >= 1 ? { w: maxSide, h: Math.round(maxSide / ratio) } : { w: Math.round(maxSide * ratio), h: maxSide };
}

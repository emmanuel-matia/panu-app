/** Règles du studio vidéo PANU, sans dépendance au navigateur ni au serveur. */

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
] as const;
const VIDEO_EXTENSIONS: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
};
export const VIDEO_TITLE_MAX = 100;
export const VIDEO_CAPTION_MAX = 500;
export const VIDEO_OVERLAY_MAX = 80;
export const MIN_CLIP_SECONDS = 1;
export const AI_PROMPT_MIN = 10;
export const AI_PROMPT_MAX = 1000;
export const AI_DURATIONS = [4, 6, 8] as const;

/** Type MIME effectif : certains téléphones n'en fournissent pas, on se fie alors à l'extension. */
export function resolveVideoMime(file: { type: string; name?: string }): string | null {
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase() ?? "";
  if (!file.type || file.type === "application/octet-stream") return VIDEO_EXTENSIONS[ext] ?? null;
  return null;
}

/** Retourne un message d'erreur, ou null si le fichier est accepté. */
export function validateVideoFile(file: { type: string; size: number; name?: string }): string | null {
  if (!resolveVideoMime(file)) {
    return "Format non pris en charge. Utilisez une vidéo MP4, WebM ou MOV.";
  }
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > VIDEO_MAX_BYTES) return "Vidéo trop lourde : 50 Mo maximum.";
  return null;
}

export function validateVideoPostFields(fields: {
  title: string;
  caption: string;
  overlayText: string;
}): string | null {
  const title = fields.title.trim();
  if (title.length === 0) return "Le titre est obligatoire.";
  if (title.length > VIDEO_TITLE_MAX) {
    return `Le titre ne doit pas dépasser ${VIDEO_TITLE_MAX} caractères.`;
  }
  if (fields.caption.trim().length > VIDEO_CAPTION_MAX) {
    return `La légende ne doit pas dépasser ${VIDEO_CAPTION_MAX} caractères.`;
  }
  if (fields.overlayText.trim().length > VIDEO_OVERLAY_MAX) {
    return `Le texte sur la vidéo ne doit pas dépasser ${VIDEO_OVERLAY_MAX} caractères.`;
  }
  return null;
}

/** Garde un découpage valide : 0 ≤ début < fin ≤ durée, avec au moins 1 s de vidéo. */
export function clampTrim(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  if (!Number.isFinite(duration) || duration <= 0) return { start: 0, end: 0 };
  const minLength = Math.min(MIN_CLIP_SECONDS, duration);
  const safeEnd = Math.min(Math.max(end, minLength), duration);
  const safeStart = Math.min(Math.max(start, 0), safeEnd - minLength);
  return { start: safeStart, end: safeEnd };
}

/** Chemin de stockage : un dossier par utilisateur (exigé par les règles d'accès). */
export function videoStoragePath(userId: string, mimeType: string, timestamp: number): string {
  const ext =
    mimeType === "video/webm"
      ? "webm"
      : mimeType === "video/quicktime"
        ? "mov"
        : mimeType === "video/ogg"
          ? "ogv"
          : "mp4";
  return `${userId}/video-${timestamp}.${ext}`;
}

export function validateAiPrompt(prompt: string): string | null {
  const text = prompt.trim();
  if (text.length < AI_PROMPT_MIN) {
    return `Décrivez la vidéo en au moins ${AI_PROMPT_MIN} caractères.`;
  }
  if (text.length > AI_PROMPT_MAX) {
    return `La description ne doit pas dépasser ${AI_PROMPT_MAX} caractères.`;
  }
  return null;
}

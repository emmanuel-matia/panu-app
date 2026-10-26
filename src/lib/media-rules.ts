/** Règles des images, audios, stories, commentaires et du Studio IA (sans dépendance navigateur/serveur). */

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const STORY_MAX_BYTES = 30 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COMMENT_MAX = 1000;
export const STORY_TEXT_MAX = 120;
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const AI_TEXT_PROMPT_MAX = 2000;
export const AI_VOICE_TEXT_MAX = 2000;
export const AI_MEDIA_PROMPT_MIN = 5;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
] as const;

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

type FileLike = { type: string; size: number; name?: string };

/** Type MIME effectif, avec repli sur l'extension quand le téléphone n'en fournit pas. */
export function resolveMime(file: { type: string; name?: string }): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? file.type;
}

export function validateImageFile(file: FileLike, maxBytes = IMAGE_MAX_BYTES): string | null {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(resolveMime(file))) {
    return "Format non pris en charge. Utilisez une image JPG, PNG, WebP ou GIF.";
  }
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > maxBytes) return `Image trop lourde : ${Math.round(maxBytes / 1024 / 1024)} Mo maximum.`;
  return null;
}

export function validateAudioFile(file: FileLike): string | null {
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(resolveMime(file))) {
    return "Format non pris en charge. Utilisez un fichier MP3, M4A, AAC, WAV ou OGG.";
  }
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > AUDIO_MAX_BYTES) return "Fichier audio trop lourd : 50 Mo maximum.";
  return null;
}

/** Une story est une photo ou une vidéo courte. */
export function validateStoryFile(file: FileLike): { error: string | null; type: "image" | "video" | null } {
  const mime = resolveMime(file);
  const type = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : null;
  if (!type) return { error: "Choisissez une photo ou une vidéo.", type: null };
  if (type === "image" && !(IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return { error: "Format d'image non pris en charge (JPG, PNG, WebP ou GIF).", type };
  }
  if (type === "video" && !["video/mp4", "video/webm", "video/quicktime"].includes(mime)) {
    return { error: "Format vidéo non pris en charge (MP4, WebM ou MOV).", type };
  }
  if (file.size === 0) return { error: "Ce fichier est vide.", type };
  if (file.size > STORY_MAX_BYTES) return { error: "Story trop lourde : 30 Mo maximum.", type };
  return { error: null, type };
}

export function validateComment(body: string): string | null {
  const text = body.trim();
  if (text.length === 0) return "Le commentaire est vide.";
  if (text.length > COMMENT_MAX) return `Le commentaire ne doit pas dépasser ${COMMENT_MAX} caractères.`;
  return null;
}

/** Une story reste visible exactement 24 h après sa publication. */
export function isStoryActive(createdAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() < STORY_LIFETIME_MS;
}

/** Chemin de stockage dans le dossier de l'utilisateur (exigé par les règles d'accès). */
export function mediaStoragePath(
  userId: string,
  folder: "images" | "audio" | "covers" | "stories" | "ai",
  mimeType: string,
  timestamp: number,
): string {
  const ext = MIME_TO_EXT[mimeType] ?? "bin";
  return `${userId}/${folder}/${timestamp}.${ext}`;
}

/** Lien public vers une publication précise. */
export function postShareUrl(origin: string, postId: string): string {
  return `${origin.replace(/\/$/, "")}/p/${postId}`;
}

/** Un remix n'est possible que si le créateur l'autorise. */
export function canRemix(post: { allowRemix: boolean } | null | undefined): boolean {
  return Boolean(post?.allowRemix);
}

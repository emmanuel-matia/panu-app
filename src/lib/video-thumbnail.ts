import { supabase } from "@/integrations/supabase/client";

/** Instant de capture : 1 s ou 10 % de la durée (évite l'écran noir du début). */
export function thumbnailTime(duration: number, trimStart = 0): number {
  if (!Number.isFinite(duration) || duration <= 0) return trimStart;
  return Math.min(trimStart + Math.max(1, duration * 0.1), Math.max(trimStart, duration - 0.1));
}

/** Capture une image JPEG (≤1200 px) depuis la vidéo elle-même, dans le navigateur. */
export function captureVideoFrame(src: string, trimStart = 0): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const done = (b: Blob | null) => {
      clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(b);
    };
    const timer = setTimeout(() => done(null), 15000);
    v.onerror = () => done(null);
    v.onloadedmetadata = () => {
      v.currentTime = thumbnailTime(v.duration, trimStart);
    };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 1200 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        if (!c.width || !c.height) return done(null);
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done(b), "image/jpeg", 0.82);
      } catch {
        done(null);
      }
    };
    v.src = src;
  });
}

/** Génère et envoie la miniature dans le dossier du propriétaire ; renvoie son chemin. */
export async function uploadVideoThumbnail(userId: string, src: string, trimStart = 0): Promise<string | null> {
  const blob = await captureVideoFrame(src, trimStart);
  if (!blob) return null;
  const path = `${userId}/cover-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("videos").upload(path, blob, { contentType: "image/jpeg" });
  return error ? null : path;
}

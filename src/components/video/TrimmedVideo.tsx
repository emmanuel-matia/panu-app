import { useEffect, type RefObject } from "react";

/**
 * Applique le découpage (début / fin) et le volume à un lecteur vidéo natif.
 * Le fichier n'est pas réencodé : le découpage est appliqué à la lecture.
 */
export function useTrimPlayback(
  ref: RefObject<HTMLVideoElement | null>,
  trimStart: number,
  trimEnd: number | null,
  volume: number,
) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.volume = Math.min(1, Math.max(0, volume));
    video.muted = volume === 0;
  }, [ref, volume]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const end = () => (trimEnd && trimEnd > trimStart ? trimEnd : video.duration || Infinity);
    const onPlay = () => {
      if (video.currentTime < trimStart || video.currentTime >= end() - 0.05) {
        video.currentTime = trimStart;
      }
    };
    const onTime = () => {
      if (video.currentTime >= end()) {
        video.pause();
        video.currentTime = trimStart;
      }
    };
    const onMeta = () => {
      if (video.currentTime < trimStart) video.currentTime = trimStart;
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [ref, trimStart, trimEnd]);
}

export function VideoOverlayText({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
      <span className="rounded-xl bg-background/70 px-3 py-1.5 text-center font-display text-base font-semibold text-foreground shadow-lg">
        {text}
      </span>
    </div>
  );
}

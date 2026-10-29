import { useEffect, type RefObject } from "react";

/**
 * Un seul lecteur vidéo peut jouer du son à la fois. Le registre est un module
 * (et non un état React) pour couvrir tous les écrans : fil, profil, stories,
 * Studio — y compris les listes où plusieurs cartes sont montées en même temps.
 */
let activeVideo: HTMLVideoElement | null = null;

/** Prend la main sur la lecture : coupe immédiatement tout autre lecteur actif. */
function claimPlayback(video: HTMLVideoElement) {
  if (activeVideo && activeVideo !== video && !activeVideo.paused) {
    activeVideo.pause();
  }
  activeVideo = video;
}

function releasePlayback(video: HTMLVideoElement) {
  if (activeVideo === video) activeVideo = null;
}

/** Coupe la lecture en cours (fermeture d'un lecteur plein écran, changement d'écran). */
export function stopAllVideoPlayback() {
  const current = activeVideo;
  activeVideo = null;
  if (current && !current.paused) current.pause();
}

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
      claimPlayback(video);
      if (video.currentTime < trimStart || video.currentTime >= end() - 0.05) {
        video.currentTime = trimStart;
      }
    };
    const onPause = () => releasePlayback(video);
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

export function VideoOverlayText({
  text,
  className = "top-3",
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text?.trim()) return null;
  return (
    <div className={`pointer-events-none absolute inset-x-3 flex justify-center ${className}`}>
      <span className="rounded-xl bg-background/70 px-3 py-1.5 text-center font-display text-base font-semibold text-foreground shadow-lg">
        {text}
      </span>
    </div>
  );
}

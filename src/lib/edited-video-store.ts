/** Passe la vidéo montée à l'écran de publication sans la renvoyer sur le réseau. */
let pending: { file: File; duration: number } | null = null;
export function setPendingEditedVideo(file: File, duration: number) {
  pending = { file, duration };
}
export function takePendingEditedVideo() {
  const p = pending;
  pending = null;
  return p;
}

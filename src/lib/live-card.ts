/** Carte de partage 1200×630 d'un direct : image réelle + badge EN DIRECT + créateur + titre. */
export async function composeLiveCard(
  src: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number },
  info: { hostName: string; title: string },
): Promise<Blob | null> {
  const W = 1200, H = 630;
  const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || src.width || 0;
  const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || src.height || 0;
  if (!sw || !sh) return null;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  // Remplissage « cover » centré.
  const s = Math.max(W / sw, H / sh);
  g.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
  const grad = g.createLinearGradient(0, H * 0.45, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // Badge EN DIRECT.
  g.font = "bold 34px system-ui, sans-serif";
  const label = "● EN DIRECT";
  const bw = g.measureText(label).width + 44;
  g.fillStyle = "#e11d48";
  g.beginPath(); g.roundRect(36, 36, bw, 60, 12); g.fill();
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(label, 58, 67);
  // Marque PANU.
  g.font = "bold 38px system-ui, sans-serif"; g.textAlign = "right";
  g.fillText("PANU", W - 40, 67);
  // Créateur + titre.
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.font = "bold 52px system-ui, sans-serif";
  g.fillText(clip(g, info.title, W - 80), 40, H - 96);
  g.font = "34px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.88)";
  g.fillText(clip(g, `${info.hostName} · panu.site`, W - 80), 40, H - 44);
  return new Promise((r) => c.toBlob((b) => r(b), "image/jpeg", 0.85));
}

function clip(g: CanvasRenderingContext2D, t: string, max: number): string {
  if (g.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && g.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
}

/** Effets du Studio Live, appliqués image par image sur un canvas diffusé (pas un simple habillage). */
export type EffectCategory = 'effets' | 'filtres' | 'beaute' | 'fond';
export type LiveLook = { effet: string; filtre: string; beaute: string; fond: string };
export const DEFAULT_LOOK: LiveLook = { effet: 'aucun', filtre: 'normal', beaute: 'aucun', fond: 'aucun' };
export const EFFECT_OPTIONS: Record<EffectCategory, { id: string; label: string }[]> = {
  effets: [{ id: 'aucun', label: 'Aucun' }, { id: 'flou', label: 'Flou' }, { id: 'cinema', label: 'Cinéma' }, { id: 'coeurs', label: 'Cœurs' }, { id: 'etoiles', label: 'Étoiles' }],
  filtres: [{ id: 'normal', label: 'Normal' }, { id: 'chaud', label: 'Chaud' }, { id: 'froid', label: 'Froid' }, { id: 'vif', label: 'Vif' }, { id: 'nb', label: 'N&B' }, { id: 'sepia', label: 'Sépia' }],
  beaute: [{ id: 'aucun', label: 'Aucun' }, { id: 'doux', label: 'Doux' }, { id: 'eclat', label: 'Éclat' }],
  fond: [{ id: 'aucun', label: 'Aucun' }, { id: 'vignette', label: 'Vignette' }, { id: 'halo', label: 'Halo PANU' }],
};
export const CATEGORY_LABELS: Record<EffectCategory, string> = { effets: 'Effets', filtres: 'Filtres', beaute: 'Beauté', fond: 'Arrière-plan' };

/** Filtre CSS canvas combiné (effet + filtre + beauté). */
export function canvasFilter(l: LiveLook): string {
  const parts: string[] = [];
  if (l.effet === 'flou') parts.push('blur(6px)');
  if (l.effet === 'cinema') parts.push('contrast(1.15) saturate(0.85)');
  const f: Record<string, string> = { chaud: 'sepia(0.25) saturate(1.3) hue-rotate(-10deg)', froid: 'saturate(1.1) hue-rotate(15deg) brightness(1.03)', vif: 'saturate(1.6) contrast(1.1)', nb: 'grayscale(1)', sepia: 'sepia(0.8)' };
  const ff = f[l.filtre]; if (ff) parts.push(ff);
  if (l.beaute === 'doux') parts.push('blur(0.8px) brightness(1.06)');
  if (l.beaute === 'eclat') parts.push('brightness(1.12) saturate(1.15) contrast(0.95)');
  return parts.length ? parts.join(' ') : 'none';
}

/** Recadrage « cover » d'une source vers le format de sortie. */
export function coverCrop(sw: number, sh: number, W: number, H: number) {
  const scale = Math.max(W / sw, H / sh); const w = sw * scale, h = sh * scale;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

type Particle = { x: number; y: number; v: number; s: number; a: number };
export function createRenderer(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!; let parts: Particle[] = [];
  return (video: HTMLVideoElement, look: LiveLook) => {
    const W = canvas.width, H = canvas.height;
    if (!video.videoWidth) return;
    g.filter = canvasFilter(look);
    const c = coverCrop(video.videoWidth, video.videoHeight, W, H);
    g.drawImage(video, c.x, c.y, c.w, c.h); g.filter = 'none';
    if (look.effet === 'cinema') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H * 0.09); g.fillRect(0, H * 0.91, W, H * 0.09); }
    if (look.fond === 'vignette' || look.fond === 'halo') {
      const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, look.fond === 'halo' ? 'rgba(124,58,237,0.55)' : 'rgba(0,0,0,0.65)');
      g.fillStyle = r; g.fillRect(0, 0, W, H);
    }
    if (look.effet === 'coeurs' || look.effet === 'etoiles') {
      if (parts.length < 28 && Math.random() < 0.3) parts.push({ x: Math.random() * W, y: H + 20, v: 1.5 + Math.random() * 2.5, s: 18 + Math.random() * 26, a: 1 });
      g.font = '32px sans-serif';
      parts = parts.filter(p => (p.y -= p.v * 2, p.a = Math.min(1, p.y / (H * 0.6)), p.y > -40));
      for (const p of parts) { g.globalAlpha = Math.max(0, p.a); g.font = `${p.s}px sans-serif`; g.fillText(look.effet === 'coeurs' ? '💖' : '✨', p.x, p.y); }
      g.globalAlpha = 1;
    } else parts = [];
  };
}

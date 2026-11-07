/** Texte d'aperçu de partage d'une publication, à partir des vrais compteurs. */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.floor(n))).replace(/\u202f|\u00a0/g, " ");
}

export function shareStatsLine(views: number, likes: number): string {
  const v = `${formatCount(views)} vue${views > 1 ? "s" : ""}`;
  const l = `${formatCount(likes)} J'aime`;
  return `${v} · ${l}`;
}

export function shareDescription(p: {
  authorDisplayName: string;
  authorUsername: string;
  caption: string | null;
  viewsCount: number;
  likesCount: number;
}): string {
  const head = `${p.authorDisplayName} (@${p.authorUsername}) · ${shareStatsLine(p.viewsCount, p.likesCount)}`;
  const cap = p.caption?.trim();
  const full = cap ? `${head} — ${cap}` : `${head} — sur panu.site`;
  return full.length > 200 ? `${full.slice(0, 197)}…` : full;
}

/** Image d'aperçu : couverture, sinon l'image elle-même ; jamais une vidéo/audio. */
export function shareImageUrl(p: { kind: string; coverUrl: string | null; mediaUrl: string | null }): string | null {
  if (p.coverUrl) return p.coverUrl;
  if (p.kind === "image") return p.mediaUrl;
  return null;
}

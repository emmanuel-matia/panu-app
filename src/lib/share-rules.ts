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
}, showStats = true): string {
  const who = `${p.authorDisplayName} (@${p.authorUsername})`;
  const head = showStats ? `${who} · ${shareStatsLine(p.viewsCount, p.likesCount)}` : who;
  const cap = p.caption?.trim();
  const full = cap ? `${head} — ${cap}` : `${head} — sur panu.site`;
  return full.length > 200 ? `${full.slice(0, 197)}…` : full;
}

/** Image d'aperçu : couverture, sinon l'image elle-même ; jamais une vidéo/audio. */
export function shareImageUrl(p: {
  kind: string;
  coverUrl: string | null;
  mediaUrl: string | null;
  authorAvatarUrl?: string | null;
}): string | null {
  if (p.coverUrl) return p.coverUrl;
  if (p.kind === "image" && p.mediaUrl) return p.mediaUrl;
  // Vidéo sans miniature ou texte : la photo du créateur, jamais l'accueil PANU.
  return p.authorAvatarUrl ?? null;
}

/** Titre de carte : texte → nom du créateur ; sinon titre de la publication. */
export function shareTitle(p: { kind: string; title: string; authorDisplayName: string; authorUsername: string }): string {
  if (p.kind === "text" || !p.title?.trim()) return `${p.authorDisplayName} (@${p.authorUsername}) sur PANU`;
  return `${p.title} — ${p.authorDisplayName} sur PANU`;
}

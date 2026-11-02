/** Catégories proposées à la publication et utilisées par l'Explorer et les raccourcis de l'accueil. */
export const POST_CATEGORIES = [
  "Afrique",
  "Business",
  "Musique",
  "Technologie",
  "Sport",
  "Éducation",
  "Lifestyle",
  "Humour",
  "Cuisine",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && (POST_CATEGORIES as readonly string[]).includes(value);
}

/** Recherche simple dans une publication : titre, légende, hashtags ou créateur. */
export function matchesSearch(
  post: { title: string; caption: string | null; authorUsername: string; authorDisplayName: string },
  query: string,
  scope: "tout" | "utilisateurs" | "videos" | "hashtags" = "tout",
): boolean {
  const q = query.trim().toLowerCase().replace(/^[#@]/, "");
  if (!q) return true;
  const author = `${post.authorUsername} ${post.authorDisplayName}`.toLowerCase();
  const content = `${post.title} ${post.caption ?? ""}`.toLowerCase();
  const tags = (post.caption?.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1).toLowerCase());
  if (scope === "utilisateurs") return author.includes(q);
  if (scope === "videos") return content.includes(q);
  if (scope === "hashtags") return tags.some((t) => t.includes(q));
  return author.includes(q) || content.includes(q);
}

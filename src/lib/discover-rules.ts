/** Règles de la page Découvrir : tout est calculé à partir des vraies publications publiques. */

type PostLike = {
  id: string;
  kind: "video" | "image" | "audio";
  source: string;
  title: string;
  caption: string | null;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  score: number;
  createdAt: string;
};

const TAG = /#[\p{L}\p{N}_]+/gu;

/** Hashtags les plus utilisés (titre et légende), du plus fréquent au moins fréquent. */
export function popularHashtags(posts: Pick<PostLike, "title" | "caption">[], limit = 12): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const seen = new Set<string>();
    for (const m of `${p.title} ${p.caption ?? ""}`.matchAll(TAG)) {
      const tag = m[0].slice(1).toLowerCase();
      if (tag.length < 2 || seen.has(tag)) continue;
      seen.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function engagement(p: Pick<PostLike, "viewsCount" | "likesCount" | "commentsCount" | "sharesCount">): number {
  return p.viewsCount + 3 * p.likesCount + 4 * p.commentsCount + 5 * p.sharesCount;
}

/** Fusionne des listes de publications sans doublon (l'ordre de la première apparition est conservé). */
export function uniquePosts<T extends { id: string }>(...lists: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/** Vidéos populaires : les plus regardées et appréciées, hors contenus déjà montrés dans « Tendances ». */
export function popularVideos<T extends PostLike>(posts: T[], excludeIds: Set<string>, limit = 10): T[] {
  return posts
    .filter((p) => p.kind === "video" && !excludeIds.has(p.id))
    .sort((a, b) => engagement(b) - engagement(a) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

/** Photos et créations IA (images, ou toute publication créée avec le Studio IA). */
export function photosAndAi<T extends PostLike>(posts: T[], limit = 12): T[] {
  return posts.filter((p) => p.kind === "image" || p.source === "ai").slice(0, limit);
}

export type DiscoverCreator = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  posts: number;
  views: number;
};

/** Créateurs à découvrir : auteurs réels des publications publiques, les plus actifs d'abord. */
export function creatorsFromPosts(posts: PostLike[], excludeId: string | null | undefined, limit = 10): DiscoverCreator[] {
  const byAuthor = new Map<string, DiscoverCreator>();
  for (const p of posts) {
    if (excludeId && p.authorId === excludeId) continue;
    const c = byAuthor.get(p.authorId) ?? {
      id: p.authorId,
      username: p.authorUsername,
      displayName: p.authorDisplayName,
      avatarUrl: p.authorAvatarUrl,
      posts: 0,
      views: 0,
    };
    c.posts += 1;
    c.views += p.viewsCount;
    byAuthor.set(p.authorId, c);
  }
  return [...byAuthor.values()].sort((a, b) => b.views - a.views || b.posts - a.posts).slice(0, limit);
}

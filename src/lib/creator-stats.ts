export type CreatorStats = {
  views: number;
  reach: number;
  videoViews: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followersTotal: number;
  followersGained: number;
  postsTotal: number;
  postsInPeriod: number;
  storiesCount: number;
  storyViews: number;
  topPosts: { id: string; title: string; kind: string; views: number; likes: number; comments: number; shares: number }[];
  daily: { day: string; views: number; followers: number; likes: number }[];
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Transforme la réponse de la base en statistiques typées (valeurs absentes = 0). */
export function parseCreatorStats(raw: unknown): CreatorStats {
  const r = obj(raw);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(obj) : []);
  return {
    views: num(r["views"]),
    reach: num(r["reach"]),
    videoViews: num(r["video_views"]),
    likes: num(r["likes"]),
    comments: num(r["comments"]),
    shares: num(r["shares"]),
    saves: num(r["saves"]),
    followersTotal: num(r["followers_total"]),
    followersGained: num(r["followers_gained"]),
    postsTotal: num(r["posts_total"]),
    postsInPeriod: num(r["posts_in_period"]),
    storiesCount: num(r["stories_count"]),
    storyViews: num(r["story_views"]),
    topPosts: list(r["top_posts"]).map((p) => ({
      id: String(p["id"] ?? ""),
      title: String(p["title"] ?? ""),
      kind: String(p["kind"] ?? ""),
      views: num(p["views"]),
      likes: num(p["likes"]),
      comments: num(p["comments"]),
      shares: num(p["shares"]),
    })),
    daily: list(r["daily"]).map((d) => ({
      day: String(d["day"] ?? ""),
      views: num(d["views"]),
      followers: num(d["followers"]),
      likes: num(d["likes"]),
    })),
  };
}

/** Vrai quand aucune activité n'a été enregistrée sur la période. */
export function isQuiet(s: CreatorStats): boolean {
  return (
    s.views + s.likes + s.comments + s.shares + s.saves + s.followersGained + s.storyViews + s.postsInPeriod === 0
  );
}

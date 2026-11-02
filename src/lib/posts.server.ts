import type { Database } from "@/integrations/supabase/types";

import type { FeedPost } from "./posts.functions";
import { signStoragePaths } from "./supabase-public.server";

export type PostRow = Database["public"]["Functions"]["list_posts"]["Returns"][number];

/** Transforme les lignes de `list_posts` en publications avec liens signés. */
export async function mapPostRows(rows: PostRow[]): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const [media, avatars] = await Promise.all([
    signStoragePaths(
      "videos",
      rows.flatMap((r) => [r.media_path, r.cover_path]),
    ),
    signStoragePaths(
      "avatars",
      rows.map((r) => r.author_avatar_url),
    ),
  ]);
  return rows.map((r) => ({
    id: r.id,
    kind: (r.kind === "image" || r.kind === "audio" ? r.kind : "video") as FeedPost["kind"],
    authorId: r.author_id,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url ? (avatars.get(r.author_avatar_url) ?? null) : null,
    authorLocation: r.author_location,
    title: r.title,
    caption: r.caption,
    mediaPath: r.media_path,
    mediaUrl: media.get(r.media_path) ?? null,
    coverPath: r.cover_path,
    coverUrl: r.cover_path ? (media.get(r.cover_path) ?? null) : null,
    mediaDuration: r.media_duration,
    category: r.category,
    trimStart: r.trim_start,
    trimEnd: r.trim_end,
    volume: r.volume,
    overlayText: r.overlay_text,
    source: r.source,
    allowRemix: r.allow_remix,
    remixOf: r.remix_of,
    remixOfUsername: r.remix_of_username,
    remixOfTitle: r.remix_of_title,
    createdAt: r.created_at,
    likesCount: Number(r.likes_count),
    commentsCount: Number(r.comments_count),
    sharesCount: Number(r.shares_count),
    viewsCount: Number(r.views_count),
    savesCount: Number(r.saves_count),
    likedByMe: Boolean(r.liked_by_me),
    savedByMe: Boolean(r.saved_by_me),
    score: Number(r.score),
  }));
}


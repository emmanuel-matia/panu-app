import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createViewerServerClient, signStoragePaths } from "./supabase-public.server";

export type FeedMode = "recent" | "following" | "trending";

export type FeedPost = {
  id: string;
  kind: "video" | "image" | "audio";
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  title: string;
  caption: string | null;
  mediaPath: string;
  mediaUrl: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  mediaDuration: number | null;
  category: string | null;
  trimStart: number;
  trimEnd: number | null;
  volume: number;
  overlayText: string | null;
  source: string;
  allowRemix: boolean;
  remixOf: string | null;
  remixOfUsername: string | null;
  remixOfTitle: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  likedByMe: boolean;
  score: number;
};

/** @deprecated conservé pour compatibilité : toutes les publications sont des FeedPost. */
export type VideoPost = FeedPost;

/**
 * Fil public : récents, abonnements (comptes suivis par le visiteur connecté),
 * tendances (vues, J'aime, commentaires, partages et récence), un auteur ou une publication.
 */
export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        mode: z.enum(["recent", "following", "trending"]).default("recent"),
        authorId: z.string().uuid().optional(),
        postId: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<FeedPost[]> => {
    const client = createViewerServerClient();
    const { data: rows, error } = await client.rpc("list_posts", {
      _mode: data.mode,
      ...(data.authorId ? { _author_id: data.authorId } : {}),
      ...(data.postId ? { _post_id: data.postId } : {}),
    });
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les publications pour le moment.");
    }
    if (!rows || rows.length === 0) return [];

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
      likedByMe: Boolean(r.liked_by_me),
      score: Number(r.score),
    }));
  });

export type PostComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  canDelete: boolean;
};

/** Commentaires d'une publication (lecture publique, droit de suppression calculé par la base). */
export const listComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PostComment[]> => {
    const client = createViewerServerClient();
    const { data: rows, error } = await client.rpc("list_comments", { _post_id: data.postId });
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les commentaires.");
    }
    const avatars = await signStoragePaths(
      "avatars",
      (rows ?? []).map((r) => r.author_avatar_url),
    );
    return (rows ?? []).map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      body: r.body,
      createdAt: r.created_at,
      authorId: r.author_id,
      authorUsername: r.author_username,
      authorDisplayName: r.author_display_name,
      authorAvatarUrl: r.author_avatar_url ? (avatars.get(r.author_avatar_url) ?? null) : null,
      canDelete: Boolean(r.can_delete),
    }));
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { signStoragePaths } from "./supabase-public.server";

export type Story = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  mediaPath: string;
  overlayText: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  viewsCount: number | null;
};

/** Stories actives (moins de 24 h) de l'utilisateur et des comptes qu'il suit. */
export const listStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Story[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_active_stories");
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les stories.");
    }
    if (!rows?.length) return [];
    const [media, avatars] = await Promise.all([
      signStoragePaths("videos", rows.map((r) => r.media_path)),
      signStoragePaths("avatars", rows.map((r) => r.author_avatar_url)),
    ]);
    return rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      authorUsername: r.author_username,
      authorDisplayName: r.author_display_name,
      authorAvatarUrl: r.author_avatar_url ? (avatars.get(r.author_avatar_url) ?? null) : null,
      mediaType: r.media_type === "video" ? "video" : "image",
      mediaUrl: media.get(r.media_path) ?? null,
      mediaPath: r.media_path,
      overlayText: r.overlay_text,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      seen: Boolean(r.seen),
      viewsCount: r.views_count === null ? null : Number(r.views_count),
    }));
  });

export type StoryViewer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
};

/** Personnes ayant vu une story — réservé à son auteur (vérifié par la base). */
export const listStoryViewers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<StoryViewer[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_story_viewers", {
      _story_id: data.storyId,
    });
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les vues.");
    }
    const avatars = await signStoragePaths("avatars", (rows ?? []).map((r) => r.avatar_url));
    return (rows ?? []).map((r) => ({
      id: r.viewer_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url ? (avatars.get(r.avatar_url) ?? null) : null,
      viewedAt: r.viewed_at,
    }));
  });

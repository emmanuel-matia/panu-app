import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createPublicServerClient, toBrowserUrl } from "./supabase-public.server";

export type VideoPost = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  title: string;
  caption: string | null;
  videoPath: string;
  videoUrl: string | null;
  trimStart: number;
  trimEnd: number | null;
  volume: number;
  overlayText: string | null;
  source: string;
  createdAt: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

/** Liste publique des vidéos publiées (toutes, ou celles d'un auteur). */
export const listVideoPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ authorId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<VideoPost[]> => {
    const client = createPublicServerClient();
    // Lecture via une fonction qui ne renvoie que les champs publics des vidéos et auteurs.
    const { data: rows, error } = await client.rpc(
      "list_video_posts",
      data.authorId ? { _author_id: data.authorId } : {},
    );
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les vidéos pour le moment.");
    }
    if (!rows || rows.length === 0) return [];

    const videoSigned = await client.storage
      .from("videos")
      .createSignedUrls(
        rows.map((r) => r.video_path),
        SIGNED_URL_TTL_SECONDS,
      );
    if (videoSigned.error) console.error(videoSigned.error);
    const videoUrls = new Map<string, string>();
    for (const item of videoSigned.data ?? []) {
      if (item.path && item.signedUrl) videoUrls.set(item.path, toBrowserUrl(item.signedUrl));
    }

    const avatarPaths = [
      ...new Set(
        rows
          .map((r) => r.author_avatar_url)
          .filter((p): p is string => Boolean(p) && !p!.startsWith("http")),
      ),
    ];
    const avatarUrls = new Map<string, string>();
    if (avatarPaths.length > 0) {
      const signed = await client.storage
        .from("avatars")
        .createSignedUrls(avatarPaths, SIGNED_URL_TTL_SECONDS);
      for (const item of signed.data ?? []) {
        if (item.path && item.signedUrl) avatarUrls.set(item.path, toBrowserUrl(item.signedUrl));
      }
    }

    return rows.map((r) => {
      const avatar = r.author_avatar_url ?? null;
      return {
        id: r.id,
        authorId: r.author_id,
        authorUsername: r.author_username,
        authorDisplayName: r.author_display_name,
        authorAvatarUrl: avatar
          ? avatar.startsWith("http")
            ? avatar
            : (avatarUrls.get(avatar) ?? null)
          : null,
        title: r.title,
        caption: r.caption,
        videoPath: r.video_path,
        videoUrl: videoUrls.get(r.video_path) ?? null,
        trimStart: r.trim_start,
        trimEnd: r.trim_end,
        volume: r.volume,
        overlayText: r.overlay_text,
        source: r.source,
        createdAt: r.created_at,
      };
    });
  });

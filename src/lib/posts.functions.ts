import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapPostRows, type PostRow } from "./posts.server";
import { createViewerServerClient, AVATAR_THUMB_PX, signStoragePaths } from "./supabase-public.server";

export type FeedMode = "recent" | "following" | "trending";

export type FeedPost = {
  id: string;
  kind: "video" | "image" | "audio";
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  authorLocation: string | null;
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
  savesCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
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
    const mapped=await mapPostRows(rows ?? []);
    const {engagementRows}=await import('./public-interactions.server');
    return Promise.all(mapped.map(async p=>{const extra=await engagementRows('post',p.id);const n=(a:string)=>extra.filter(r=>r.action===a).length;return {...p,likesCount:p.likesCount+n('like'),commentsCount:p.commentsCount+n('comment'),sharesCount:p.sharesCount+n('share'),viewsCount:p.viewsCount+n('view')};}));
  });

/** Publications enregistrées par l'utilisateur connecté (les plus récentes d'abord). */
export const listSavedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedPost[]> => {
    const { data: saves, error } = await context.supabase
      .from("post_saves")
      .select("post_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger vos enregistrements.");
    }
    if (!saves?.length) return [];
    const results = await Promise.all(
      saves.map((s) => context.supabase.rpc("list_posts", { _mode: "recent", _post_id: s.post_id })),
    );
    const rows: PostRow[] = [];
    for (const r of results) {
      if (r.error) {
        console.error(r.error);
        throw new Error("Impossible de charger vos enregistrements.");
      }
      if (r.data?.[0]) rows.push(r.data[0]);
    }
    return mapPostRows(rows);
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
  publicInteraction?: boolean;
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
      (rows ?? []).map((r) => ({ path: r.author_avatar_url, ownerId: r.author_id })),
      undefined,
      AVATAR_THUMB_PX,
    );
    const {publicCommentRows,verifiedPublicUser}=await import('./public-interactions.server');
    const extra=await publicCommentRows('post',data.postId);const uid=await verifiedPublicUser();
    const {data:staff}=uid?await client.rpc('my_staff_role'):{data:null};
    const {data:post}=await client.rpc('list_posts',{_post_id:data.postId});
    const guestComments:PostComment[]=extra.map(r=>({id:r.id,parentId:r.parent_id,body:r.body??'',createdAt:r.created_at,authorId:r.user_id??'',authorUsername:r.username??'',authorDisplayName:r.display_name,authorAvatarUrl:null,canDelete:Boolean(uid&&(uid===r.user_id||uid===post?.[0]?.author_id||staff)),publicInteraction:true}));
    return [...(rows ?? []).map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      body: r.body,
      createdAt: r.created_at,
      authorId: r.author_id,
      authorUsername: r.author_username,
      authorDisplayName: r.author_display_name,
      authorAvatarUrl: r.author_avatar_url ? (avatars.get(r.author_avatar_url) ?? null) : null,
      canDelete: Boolean(r.can_delete),
    })),...guestComments].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  });

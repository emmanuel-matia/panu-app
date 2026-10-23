import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, Trash2, Video } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listVideoPosts, type VideoPost } from "@/lib/posts.functions";

import { useTrimPlayback, VideoOverlayText } from "./TrimmedVideo";

export const videoPostsKey = (authorId?: string) => ["posts", "video", authorId ?? "all"] as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function VideoPostCard({ post }: { post: VideoPost }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useTrimPlayback(ref, post.trimStart, post.trimEnd, post.volume);

  const isOwner = user?.id === post.authorId;

  async function handleDelete() {
    if (!window.confirm("Supprimer définitivement cette vidéo ?")) return;
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id);
    if (deleteError) {
      setDeleting(false);
      setError("Suppression impossible. Réessayez.");
      return;
    }
    await supabase.storage.from("videos").remove([post.videoPath]);
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <article className="border-b border-border px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Link
          to="/@{$username}"
          params={{ username: post.authorUsername }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="[&>div]:size-10 [&>div]:border">
            <ProfileAvatar url={post.authorAvatarUrl} alt={`Avatar de ${post.authorDisplayName}`} size="md" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {post.authorDisplayName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              @{post.authorUsername} · {dateFormat.format(new Date(post.createdAt))}
            </span>
          </span>
        </Link>
        {isOwner ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-label="Supprimer la vidéo"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
        {post.videoUrl ? (
          <video
            ref={ref}
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70vh] w-full bg-background object-contain"
          />
        ) : (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Vidéo momentanément indisponible.
          </p>
        )}
        <VideoOverlayText text={post.overlayText} />
      </div>

      <h3 className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {post.title}
        {post.source === "ai" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-accent">
            <Sparkles className="size-3" /> IA
          </span>
        ) : null}
      </h3>
      {post.caption ? (
        <p className="mt-1 text-sm whitespace-pre-line text-surface-foreground">{post.caption}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </article>
  );
}

/** Liste des vidéos publiées (fil d'accueil ou profil d'un auteur). */
export function VideoPostList({
  authorId,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  authorId?: string | undefined;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  const query = useQuery({
    queryKey: videoPostsKey(authorId),
    queryFn: () => listVideoPosts({ data: authorId ? { authorId } : {} }),
  });

  if (query.isPending) {
    return (
      <div className="space-y-3 px-4 py-5">
        <div className="aspect-video animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">{query.error.message}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState icon={Video} title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }
  return (
    <div>
      {query.data.map((post) => (
        <VideoPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

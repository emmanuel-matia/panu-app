import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Check,
  Heart,
  MessageSquareText,
  Play,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listPosts, type VideoPost } from "@/lib/posts.functions";

import { CommentsSheet } from "./CommentsSheet";

import { useTrimPlayback, VideoOverlayText } from "./TrimmedVideo";

/** Modes de tri supportés par la RPC `list_posts`. */
export type FeedMode = "recent" | "following" | "trending";

export const videoPostsKey = (authorId?: string, mode: FeedMode = "recent") =>
  ["posts", "video", authorId ?? "all", mode] as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Met en valeur les #hashtags d'une légende. */
function Caption({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-semibold text-electric">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title ?? label}
      className="flex flex-col items-center gap-1 text-foreground drop-shadow-md transition-transform active:scale-90 disabled:opacity-55"
    >
      <Icon
        className={`size-7 ${active ? "text-destructive" : "text-foreground"}`}
        strokeWidth={1.75}
        fill={active ? "currentColor" : "none"}
      />
      <span className="text-[0.6875rem] font-semibold">{label}</span>
    </button>
  );
}

function VideoPostCard({ post }: { post: VideoPost }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [time, setTime] = useState(post.trimStart);
  const [duration, setDuration] = useState(0);
  const [shared, setShared] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likesCount);
  const [liking, setLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  useTrimPlayback(ref, post.trimStart, post.trimEnd, post.volume);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikes(post.likesCount);
  }, [post.id, post.likedByMe, post.likesCount]);

  const isOwner = user?.id === post.authorId;
  const end = post.trimEnd && post.trimEnd > post.trimStart ? post.trimEnd : duration;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(video.currentTime);
    const onMeta = () => {
      setDuration(video.duration || 0);
      setLandscape(video.videoWidth > video.videoHeight);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [post.mediaUrl]);

  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  async function toggleLike() {
    if (!user) {
      setError("Connectez-vous pour aimer une vidéo.");
      return;
    }
    if (liking) return;
    const next = !liked;
    setLiking(true);
    setError(null);
    // Mise à jour optimiste : l'interface réagit immédiatement.
    setLiked(next);
    setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
    const { error: likeError } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    setLiking(false);
    if (likeError) {
      setLiked(!next);
      setLikes((count) => Math.max(0, count + (next ? -1 : 1)));
      setError("Impossible d'enregistrer votre J'aime.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  async function handleShare() {
    const url = `${window.location.origin}/@${post.authorUsername}`;
    const track = () => {
      void supabase.rpc("record_post_share", { _post_id: post.id, _channel: "lien" });
    };
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.caption ?? post.title, url });
        track();
        return;
      }
      await navigator.clipboard.writeText(url);
      track();
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  }

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
    await supabase.storage.from("videos").remove([post.mediaPath]);
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  const soon = "Bientôt disponible";

  return (
    <article className="px-3 py-2">
      <div className="relative aspect-[9/14] max-h-[78vh] w-full overflow-hidden rounded-3xl border border-border bg-card">
        {post.mediaUrl ? (
          <video
            ref={ref}
            src={post.mediaUrl}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            className={`absolute inset-0 size-full bg-background ${landscape ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Vidéo momentanément indisponible.
          </p>
        )}

        {/* Dégradés de lisibilité */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />

        <VideoOverlayText text={post.overlayText} className="top-20" />

        {post.mediaUrl && !playing ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Lire la vidéo"
            className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground backdrop-blur-sm"
          >
            <Play className="ml-1 size-8" fill="currentColor" strokeWidth={1.5} />
          </button>
        ) : null}

        {/* En-tête créateur */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-3">
          <Link
            to="/@{$username}"
            params={{ username: post.authorUsername }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <ProfileAvatar
              url={post.authorAvatarUrl}
              alt={`Avatar de ${post.authorDisplayName}`}
              size="sm"
            />
            <span className="min-w-0 drop-shadow-md">
              <span className="block truncate text-sm font-bold text-foreground">
                {post.authorDisplayName}
              </span>
              <span className="block truncate text-xs text-foreground/80">
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
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/30 bg-background/40 text-foreground backdrop-blur-sm transition-colors hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          ) : (
            <FollowButton profileId={post.authorId} username={post.authorUsername} compact />
          )}
        </div>

        {/* Barre d'actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          <Link
            to="/@{$username}"
            params={{ username: post.authorUsername }}
            aria-label={`Profil de ${post.authorDisplayName}`}
            className="relative mb-1"
          >
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-gold bg-gold font-display text-lg font-bold text-gold-foreground">
              {post.authorAvatarUrl ? (
                <img src={post.authorAvatarUrl} alt="" className="size-full object-cover" />
              ) : (
                post.authorDisplayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="absolute -bottom-1.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <Plus className="size-3.5" strokeWidth={3} />
            </span>
          </Link>
          <RailButton
            icon={Heart}
            label={likes > 0 ? String(likes) : "J'aime"}
            onClick={() => void toggleLike()}
            title={liked ? "Retirer mon J'aime" : "J'aime"}
            active={liked}
          />
          <RailButton
            icon={MessageSquareText}
            label={post.commentsCount > 0 ? String(post.commentsCount) : "Commenter"}
            onClick={() => setCommentsOpen(true)}
            title="Commentaires"
          />
          <RailButton
            icon={Bookmark}
            label="Enregistrer"
            disabled
            title={`Enregistrer — ${soon}`}
          />
          <RailButton
            icon={shared ? Check : Share2}
            label={shared ? "Copié" : "Partager"}
            onClick={() => void handleShare()}
          />
          {post.source === "ai" ? (
            <span
              title="Créée avec l'IA"
              className="flex size-11 items-center justify-center rounded-full bg-gold text-gold-foreground"
            >
              <Sparkles className="size-5" strokeWidth={2} />
            </span>
          ) : null}
        </div>

        {/* Titre + légende */}
        <div className="absolute inset-x-0 bottom-0 space-y-1 pr-20 pb-7 pl-4">
          <h3 className="text-sm font-bold text-foreground drop-shadow-md">{post.title}</h3>
          {post.caption ? (
            <p className="line-clamp-3 text-sm whitespace-pre-line text-foreground/90 drop-shadow-md">
              <Caption text={post.caption} />
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        {post.mediaUrl && end > post.trimStart ? (
          <input
            type="range"
            aria-label="Position dans la vidéo"
            min={post.trimStart}
            max={end}
            step={0.1}
            value={Math.min(Math.max(time, post.trimStart), end)}
            onChange={(e) => {
              if (ref.current) ref.current.currentTime = Number(e.target.value);
            }}
            className="absolute inset-x-4 bottom-2 h-1 accent-gold"
          />
        ) : null}
      </div>
      {commentsOpen ? (
        <CommentsSheet
          postId={post.id}
          commentsCount={post.commentsCount}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </article>
  );
}

/** Liste des vidéos publiées (fil d'accueil ou profil d'un auteur). */
export function VideoPostList({
  authorId,
  mode = "recent",
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  authorId?: string | undefined;
  mode?: FeedMode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  const query = useQuery({
    queryKey: videoPostsKey(authorId, authorId ? "recent" : mode),
    queryFn: () => listPosts({ data: authorId ? { mode: "recent", authorId } : { mode } }),
  });

  if (query.isPending) {
    return (
      <div className="px-3 py-2">
        <div className="aspect-[9/14] max-h-[78vh] w-full animate-pulse rounded-3xl border border-border bg-surface" />
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
      <EmptyState
        icon={Video}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="space-y-2 py-1">
      {query.data.map((post) => (
        <VideoPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

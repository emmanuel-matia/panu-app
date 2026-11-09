import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Check,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Music2,
  PencilLine,
  Play,
  Repeat2,
  Share2,
  Sparkles,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { canRemix, postShareUrl } from "@/lib/media-rules";
import { postMatchesFeedPrefs, shouldAutoplay } from "@/lib/prefs";
import { listPosts, type FeedMode, type VideoPost } from "@/lib/posts.functions";
import { VIDEO_CAPTION_MAX, VIDEO_TITLE_MAX } from "@/lib/video-rules";
import { cn } from "@/lib/utils";

import { ReportPostDialog } from "@/components/video/ReportPostDialog";
import { CommentsSheet } from "./CommentsSheet";
import { clock, compactCount, timeAgo } from "./time";
import { useTrimPlayback, VideoOverlayText } from "./TrimmedVideo";

export const videoPostsKey = (authorId?: string) => ["posts", "video", authorId ?? "all"] as const;

/** Une seule vidéo joue à la fois : démarrer une vidéo met en pause la précédente (image et son). */
let activeVideo: HTMLVideoElement | null = null;
function claimPlayback(video: HTMLVideoElement) {
  if (activeVideo && activeVideo !== video && !activeVideo.paused) activeVideo.pause();
  activeVideo = video;
}
/** Part de la vidéo qui doit être visible pour qu'elle démarre automatiquement. */
const AUTOPLAY_VISIBLE_RATIO = 0.6;

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
  active = false,
  activeClass,
  disabled,
  ariaLabel,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 text-foreground drop-shadow-md transition-transform active:scale-90 disabled:opacity-50"
    >
      <Icon
        className={cn("size-7", active && activeClass)}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [time, setTime] = useState(post.trimStart);
  const [duration, setDuration] = useState(0);
  const [shared, setShared] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editCaption, setEditCaption] = useState(post.caption ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likesCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [saves, setSaves] = useState(post.savesCount);
  const viewRecorded = useRef(false);
  const { prefs } = useSettings();
  useTrimPlayback(ref, post.trimStart, post.trimEnd, post.volume);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikes(post.likesCount);
    setSaved(post.savedByMe);
    setSaves(post.savesCount);
  }, [post.likedByMe, post.likesCount, post.savedByMe, post.savesCount]);

  const isOwner = user?.id === post.authorId;
  const isImage = post.kind === "image";
  const end = post.trimEnd && post.trimEnd > post.trimStart ? post.trimEnd : duration;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onPlay = () => {
      claimPlayback(video);
      setPlaying(true);
      if (!viewRecorded.current && user) {
        viewRecorded.current = true;
        void supabase.rpc("record_post_view", { _post_id: post.id });
      }
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(video.currentTime);
    const onVolume = () => setMuted(video.muted);
    const onMeta = () => {
      setDuration(video.duration || 0);
      setLandscape(video.videoWidth > video.videoHeight);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("loadedmetadata", onMeta);
      video.pause();
      if (activeVideo === video) activeVideo = null;
    };
  }, [post.mediaUrl, post.id, user]);

  // Lecture automatique de la vidéo visible ; arrêt (image et son) dès qu'elle sort de l'écran.
  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= AUTOPLAY_VISIBLE_RATIO) {
          if (!video.paused) return;
          const connection = (navigator as unknown as { connection?: { type?: string; saveData?: boolean } }).connection;
          if (!shouldAutoplay(prefs.autoplay, connection, prefs.data_saver)) return;
          if (prefs.start_muted) video.muted = true;
          video.play().catch(() => {
            // Le navigateur refuse le son sans geste de l'utilisateur : on démarre sans le son.
            video.muted = true;
            void video.play().catch(() => undefined);
          });
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: [0, AUTOPLAY_VISIBLE_RATIO, 1] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [post.mediaUrl, prefs.autoplay, prefs.data_saver, prefs.start_muted]);

  function requireUser(): boolean {
    if (user) return true;
    void navigate({ to: "/connexion" });
    return false;
  }

  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      if (post.volume > 0) video.muted = false;
      void video.play();
    } else video.pause();
  }

  function toggleMute() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  async function toggleLike() {
    if (!requireUser() || !user) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const { error: likeError } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    if (likeError) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      setError("Action impossible. Réessayez.");
    }
  }

  async function toggleSave() {
    if (!requireUser() || !user) return;
    const next = !saved;
    setSaved(next);
    setSaves((n) => n + (next ? 1 : -1));
    const { error: saveError } = next
      ? await supabase.from("post_saves").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
    if (saveError) {
      setSaved(!next);
      setSaves((n) => n + (next ? -1 : 1));
      setError("Action impossible. Réessayez.");
    }
  }

  async function handleSaveEdit() {
    const title = editTitle.trim();
    if (!title) {
      setError("Le titre est obligatoire.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("posts")
      .update({ title, caption: editCaption.trim() ? editCaption.trim() : null })
      .eq("id", post.id);
    setSavingEdit(false);
    if (updateError) {
      setError("Modification impossible. Réessayez.");
      return;
    }
    setEditing(false);
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  async function handleShare() {
    const url = postShareUrl("https://panu.site", post.id);
    try {
      if (navigator.share) {
        // Lien seul : une seule carte d'aperçu propre dans WhatsApp/Messenger.
        await navigator.share({ title: post.title, url });
        if (user) void supabase.rpc("record_post_share", { _post_id: post.id, _channel: "natif" });
        return;
      }
      await navigator.clipboard.writeText(url);
      if (user) void supabase.rpc("record_post_share", { _post_id: post.id, _channel: "lien" });
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  }

  function handleRemix() {
    if (!canRemix(post)) {
      setError("Le créateur n'autorise pas le remix de cette publication.");
      return;
    }
    if (!requireUser()) return;
    ref.current?.pause();
    void navigate({ to: "/creer/video", search: { remix: post.id } });
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
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

  const overlayBtn =
    "flex size-9 items-center justify-center rounded-full bg-background/40 text-foreground backdrop-blur-sm";

  return (
    <article className="snap-start scroll-mt-20 px-3 py-2">
      <div className="relative h-[calc(100dvh-17rem)] min-h-[26rem] w-full overflow-hidden rounded-3xl border border-border bg-card">
        {isImage && post.mediaUrl ? (
          <img src={post.mediaUrl} alt={post.title} className="absolute inset-0 size-full object-cover" />
        ) : post.mediaUrl ? (
          <>
            {post.kind === "audio" ? (
              post.coverUrl ? (
                <img src={post.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-gradient">
                  <Music2 className="size-16 text-accent" strokeWidth={1.25} />
                </div>
              )
            ) : null}
            <video
              ref={ref}
              src={post.mediaUrl}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              className={cn(
                "absolute inset-0 size-full",
                post.kind === "audio" ? "opacity-0" : "bg-background",
                landscape ? "object-contain" : "object-cover",
              )}
            />
          </>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Publication momentanément indisponible.
          </p>
        )}

        {/* Dégradés de lisibilité */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-background/95 via-background/55 to-transparent" />

        <VideoOverlayText text={post.overlayText} className="top-20" />

        {post.mediaUrl && !isImage && !playing ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Lire"
            className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground backdrop-blur-sm"
          >
            <Play className="ml-1 size-8" fill="currentColor" strokeWidth={1.5} />
          </button>
        ) : null}

        {/* En-tête créateur */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3">
          <Link
            to="/@{$username}"
            params={{ username: post.authorUsername }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span className="rounded-full bg-brand p-0.5">
              <ProfileAvatar url={post.authorAvatarUrl} alt={`Avatar de ${post.authorDisplayName}`} size="sm" />
            </span>
            <span className="min-w-0 drop-shadow-md">
              <span className="block truncate text-sm font-bold text-foreground">{post.authorDisplayName}</span>
              <span className="flex items-center gap-1 truncate text-xs text-foreground/80">
                {post.authorLocation ? (
                  <>
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{post.authorLocation}</span> ·
                  </>
                ) : (
                  <span className="truncate">@{post.authorUsername} ·</span>
                )}
                <span className="shrink-0">{timeAgo(post.createdAt)}</span>
              </span>
            </span>
          </Link>
          {isOwner ? null : <FollowButton profileId={post.authorId} username={post.authorUsername} compact />}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Options de la publication"
                aria-expanded={menuOpen}
                className={overlayBtn}
              >
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && !isOwner ? (
                <div className="absolute top-11 right-0 z-10 w-44 overflow-hidden rounded-xl border border-border bg-popover text-sm shadow-glow">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      ref.current?.pause();
                      setReporting(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-foreground hover:bg-muted"
                  >
                    <Flag className="size-4" /> Signaler
                  </button>
                </div>
              ) : null}
              {menuOpen && isOwner ? (
                <div className="absolute top-11 right-0 z-10 w-44 overflow-hidden rounded-xl border border-border bg-popover text-sm shadow-glow">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      ref.current?.pause();
                      setEditing(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-foreground hover:bg-muted"
                  >
                    <PencilLine className="size-4" /> Modifier
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-destructive hover:bg-muted"
                  >
                    <Trash2 className="size-4" /> Supprimer
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Barre d'actions */}
        <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
          <RailButton
            icon={Heart}
            label={prefs.show_reaction_counts ? compactCount(likes) : "J'aime"}
            ariaLabel={liked ? "Retirer le j'aime" : "J'aime"}
            active={liked}
            activeClass="text-destructive"
            onClick={() => void toggleLike()}
          />
          <RailButton
            icon={MessageCircle}
            label={compactCount(post.commentsCount)}
            ariaLabel="Commentaires"
            onClick={() => {
              ref.current?.pause();
              setShowComments(true);
            }}
          />
          <RailButton
            icon={Bookmark}
            label={compactCount(saves)}
            ariaLabel={saved ? "Retirer des enregistrements" : "Enregistrer"}
            active={saved}
            activeClass="text-gold"
            onClick={() => void toggleSave()}
          />
          <RailButton
            icon={shared ? Check : Share2}
            label={shared ? "Copié" : "Partager"}
            onClick={() => void handleShare()}
          />
          {post.allowRemix ? <RailButton icon={Repeat2} label="Remixer" onClick={handleRemix} /> : null}
          {post.source === "ai" ? (
            <span title="Créée avec l'IA" className="flex size-9 items-center justify-center rounded-full bg-gold text-gold-foreground">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
          ) : null}
        </div>

        {/* Titre + légende + son */}
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 pr-20 pb-6 pl-4">
          <h3 className="text-base font-bold text-foreground drop-shadow-md">{post.title}</h3>
          {post.caption ? (
            <p
              className={cn(
                "text-sm whitespace-pre-line text-foreground/90 drop-shadow-md",
                !expanded && "line-clamp-2",
              )}
            >
              <Caption text={post.caption} />
            </p>
          ) : null}
          {post.caption && post.caption.length > 90 ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-xs font-semibold text-foreground"
            >
              {expanded ? "Moins" : "Plus"}
            </button>
          ) : null}
          {post.remixOf ? (
            <p className="flex items-center gap-1 text-xs text-foreground/80">
              <Repeat2 className="size-3.5" /> Remix
              {post.remixOfUsername ? ` de @${post.remixOfUsername}` : ""}
            </p>
          ) : null}
          {!isImage ? (
            <p className="flex max-w-full items-center gap-1.5 truncate text-xs text-foreground/85">
              <Music2 className="size-3.5 shrink-0" /> Son original - {post.authorUsername}
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        {post.mediaUrl && !isImage ? (
          <div className="absolute right-3 bottom-6 flex items-center gap-2">
            {end > 0 ? (
              <span className="text-[0.6875rem] font-medium text-foreground/85 tabular-nums drop-shadow-md">
                {clock(Math.max(0, time - post.trimStart))} / {clock(end - post.trimStart)}
              </span>
            ) : null}
            {post.volume > 0 ? (
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Activer le son" : "Couper le son"}
                className="flex size-8 items-center justify-center rounded-full bg-background/50 text-foreground backdrop-blur-sm"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            ) : null}
          </div>
        ) : null}

        {post.mediaUrl && !isImage && end > post.trimStart ? (
          <input
            type="range"
            aria-label="Position dans la lecture"
            min={post.trimStart}
            max={end}
            step={0.1}
            value={Math.min(Math.max(time, post.trimStart), end)}
            onChange={(e) => {
              if (ref.current) ref.current.currentTime = Number(e.target.value);
            }}
            className="absolute inset-x-4 bottom-1.5 h-1 accent-gold"
          />
        ) : null}

        {editing ? (
          <div className="absolute inset-0 z-10 flex flex-col justify-end bg-background/80 p-4 backdrop-blur-sm">
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Modifier la publication</h3>
              <label className="block text-xs text-muted-foreground">
                Titre
                <input
                  value={editTitle}
                  maxLength={VIDEO_TITLE_MAX}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Légende et #hashtags
                <textarea
                  value={editCaption}
                  rows={3}
                  maxLength={VIDEO_CAPTION_MAX}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditTitle(post.title);
                    setEditCaption(post.caption ?? "");
                  }}
                  className="h-10 flex-1 rounded-full border border-border text-sm font-semibold text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => void handleSaveEdit()}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 className="size-4 animate-spin" /> : null}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {reporting ? <ReportPostDialog postId={post.id} onClose={() => setReporting(false)} /> : null}
      {showComments ? <CommentsSheet postId={post.id} onClose={() => setShowComments(false)} /> : null}
    </article>
  );
}

/** Liste des publications (fil d'accueil, profil d'un auteur, publication partagée ou recherche). */
export function VideoPostList({
  authorId,
  postId,
  mode = "recent",
  filter,
  filterKey,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  authorId?: string | undefined;
  postId?: string | undefined;
  mode?: FeedMode;
  /** Filtre local (recherche, catégorie) appliqué aux publications chargées. */
  filter?: ((post: VideoPost) => boolean) | undefined;
  filterKey?: string | undefined;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  const { user } = useAuth();
  const { prefs } = useSettings();
  // Défilement « une vidéo par écran » : la page s'aligne sur la vidéo la plus proche.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollSnapType;
    root.style.scrollSnapType = "y proximity";
    return () => {
      root.style.scrollSnapType = previous;
    };
  }, []);

  const query = useQuery({
    queryKey: [...videoPostsKey(authorId), mode, postId ?? "", filterKey ?? ""],
    queryFn: () =>
      listPosts({
        data: {
          mode,
          ...(authorId ? { authorId } : {}),
          ...(postId ? { postId } : {}),
        },
      }),
  });

  if (query.isPending) {
    return (
      <div className="px-3 py-2">
        <div className="h-[calc(100dvh-17rem)] min-h-[26rem] w-full animate-pulse rounded-3xl border border-border bg-surface" />
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
  const byPrefs =
    authorId || postId ? query.data : query.data.filter((p) => postMatchesFeedPrefs(prefs, p, user?.id));
  const posts = filter ? byPrefs.filter(filter) : byPrefs;
  if (posts.length === 0) {
    return <EmptyState icon={Video} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return (
    <div className="space-y-2 py-1">
      {posts.map((post) => (
        <VideoPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

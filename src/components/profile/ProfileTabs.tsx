import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Camera, Clock, Eye, Grid3x3, ImageIcon, Loader2, Music2, Play, Sparkles, Video } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { groupStories, StoryViewer } from "@/components/home/StoriesRow";
import { VideoPostList } from "@/components/video/VideoPostList";
import { useAuth } from "@/hooks/useAuth";
import { listPosts, listSavedPosts, type FeedPost } from "@/lib/posts.functions";
import { postsForTab, profileTabsFor, type ProfileTab } from "@/lib/profile-rules";
import { listStories } from "@/lib/stories.functions";
import { cn } from "@/lib/utils";

const TAB_LABEL: Record<ProfileTab, string> = {
  publications: "Publications",
  videos: "Vidéos",
  photos: "Photos",
  stories: "Stories",
  enregistres: "Enregistrés",
};
const TAB_ICON: Record<ProfileTab, typeof Grid3x3> = {
  publications: Grid3x3,
  videos: Video,
  photos: ImageIcon,
  stories: Sparkles,
  enregistres: Bookmark,
};

/** Onglets du profil, alimentés uniquement par les vraies publications, stories et enregistrements. */
export function ProfileTabs({
  profileId,
  isOwner,
  ownerActions,
}: {
  profileId: string;
  isOwner: boolean;
  /** Bouton d'action proposé au propriétaire quand un onglet est vide. */
  ownerActions?: Partial<Record<ProfileTab, ReactNode>>;
}) {
  const tabs = profileTabsFor(isOwner);
  const [tab, setTab] = useState<ProfileTab>("publications");
  const action = isOwner ? ownerActions?.[tab] : undefined;

  return (
    <div className="border-t border-border">
      <div
        role="tablist"
        aria-label="Contenus du profil"
        className="sticky top-0 z-10 flex overflow-x-auto border-b border-border bg-background/95 backdrop-blur [scrollbar-width:none]"
      >
        {tabs.map((t) => {
          const Icon = TAB_ICON[t];
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={cn(
                "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2.5 text-[0.6875rem] font-medium transition-colors",
                active ? "border-accent text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === "publications" ? (
          <VideoPostList
            authorId={profileId}
            emptyTitle="Aucune publication"
            emptyDescription={isOwner ? "Vos publications apparaîtront ici." : "Ce profil n'a encore rien publié."}
            emptyAction={action}
          />
        ) : tab === "videos" ? (
          <VideoPostList
            authorId={profileId}
            filter={(p) => p.kind === "video"}
            emptyTitle="Aucune vidéo"
            emptyDescription={isOwner ? "Vos vidéos publiées apparaîtront ici." : "Aucune vidéo publiée pour le moment."}
            emptyAction={action}
          />
        ) : tab === "photos" ? (
          <AuthorGrid profileId={profileId} tab="photos" isOwner={isOwner} action={action} />
        ) : tab === "stories" ? (
          <StoriesTab profileId={profileId} isOwner={isOwner} action={action} />
        ) : (
          <SavedTab />
        )}
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse bg-surface" />
      ))}
    </div>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground"
      >
        Réessayer
      </button>
    </div>
  );
}

function AuthorGrid({
  profileId,
  tab,
  isOwner,
  action,
}: {
  profileId: string;
  tab: ProfileTab;
  isOwner: boolean;
  action?: ReactNode;
}) {
  const query = useQuery({
    queryKey: ["posts", "profile-grid", profileId],
    queryFn: () => listPosts({ data: { mode: "recent", authorId: profileId } }),
  });
  if (query.isPending) return <GridSkeleton />;
  if (query.isError) return <ErrorRetry message={query.error.message} onRetry={() => void query.refetch()} />;
  const posts = postsForTab(tab, query.data);
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="Aucune photo"
        description={isOwner ? "Vos images publiées apparaîtront ici." : "Aucune image publiée pour le moment."}
        action={action}
      />
    );
  }
  return <PostGrid posts={posts} />;
}

function SavedTab() {
  const fetchSaved = useServerFn(listSavedPosts);
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["posts", "saved", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchSaved(),
  });
  if (query.isPending) return <GridSkeleton />;
  if (query.isError) return <ErrorRetry message={query.error.message} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Aucun enregistrement"
        description="Touchez l'icône Enregistrer sur une publication pour la retrouver ici. Vous seul voyez cette liste."
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground"
          >
            Parcourir le fil
          </Link>
        }
      />
    );
  }
  return <PostGrid posts={query.data} showAuthor />;
}

function PostGrid({ posts, showAuthor = false }: { posts: FeedPost[]; showAuthor?: boolean }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5 p-0.5">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            to="/p/$postId"
            params={{ postId: post.id }}
            aria-label={`Ouvrir « ${post.title} »`}
            className="relative block aspect-[3/4] overflow-hidden bg-surface"
          >
            {post.kind === "image" && post.mediaUrl ? (
              <img src={post.mediaUrl} alt={post.title} loading="lazy" className="size-full object-cover" />
            ) : post.coverUrl ? (
              <img src={post.coverUrl} alt={post.title} loading="lazy" className="size-full object-cover" />
            ) : post.kind === "video" && post.mediaUrl ? (
              <video
                src={`${post.mediaUrl}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-surface-gradient">
                <Music2 className="size-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
            <span className="absolute top-1.5 right-1.5 text-foreground drop-shadow">
              {post.kind === "video" ? (
                <Play className="size-3.5 fill-current" />
              ) : post.kind === "audio" ? (
                <Music2 className="size-3.5" />
              ) : null}
            </span>
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-background/90 to-transparent px-1.5 pt-4 pb-1 text-[0.625rem] text-foreground">
              <Eye className="size-3" />
              {post.viewsCount}
              {showAuthor ? <span className="ml-auto truncate">@{post.authorUsername}</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function hoursLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  return h >= 1 ? `${h} h` : `${Math.max(1, Math.floor(ms / 60_000))} min`;
}

function StoriesTab({ profileId, isOwner, action }: { profileId: string; isOwner: boolean; action?: ReactNode }) {
  const { user } = useAuth();
  const fetchStories = useServerFn(listStories);
  const [open, setOpen] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["stories", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchStories(),
  });
  const groups = useMemo(
    () => groupStories((query.data ?? []).filter((s) => s.authorId === profileId), user?.id),
    [query.data, profileId, user?.id],
  );
  const stories = groups[0]?.stories ?? [];

  if (!user) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Stories réservées aux abonnés"
        description="Connectez-vous et suivez ce compte pour voir ses stories des dernières 24 h."
      />
    );
  }
  if (query.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (query.isError) return <ErrorRetry message={query.error.message} onRetry={() => void query.refetch()} />;
  if (stories.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aucune story active"
        description={
          isOwner
            ? "Vos stories restent visibles 24 h par vos abonnés, puis disparaissent."
            : "Aucune story en ce moment. Les stories ne sont visibles que par les abonnés pendant 24 h."
        }
        action={action}
      />
    );
  }
  return (
    <>
      <ul className="grid grid-cols-3 gap-0.5 p-0.5">
        {stories.map((story, i) => (
          <li key={story.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label="Voir la story"
              className="relative block aspect-[9/16] w-full overflow-hidden bg-surface"
            >
              {story.mediaUrl ? (
                story.mediaType === "video" ? (
                  <video src={`${story.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                ) : (
                  <img src={story.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
                )
              ) : null}
              {story.overlayText ? (
                <span className="absolute inset-x-1 top-1/2 -translate-y-1/2 truncate text-center text-[0.6875rem] font-semibold text-foreground drop-shadow">
                  {story.overlayText}
                </span>
              ) : null}
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-background/90 to-transparent px-1.5 pt-4 pb-1 text-[0.625rem] text-foreground">
                <Clock className="size-3" /> {hoursLeft(story.expiresAt)}
                {story.viewsCount !== null ? (
                  <span className="ml-auto flex items-center gap-0.5">
                    <Eye className="size-3" /> {story.viewsCount}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && groups[0] ? (
        <StoryViewer groups={groups} startGroup={0} startStory={open} myId={user.id} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

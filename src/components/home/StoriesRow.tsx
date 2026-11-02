import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { timeAgo } from "@/components/video/time";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listStories, listStoryViewers, type Story } from "@/lib/stories.functions";
import { cn } from "@/lib/utils";

const IMAGE_STORY_MS = 5000;

export type Group = { authorId: string; username: string; displayName: string; avatarUrl: string | null; stories: Story[] };

export function groupStories(stories: Story[], myId: string | undefined): Group[] {
  const map = new Map<string, Group>();
  for (const s of [...stories].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const g = map.get(s.authorId) ?? {
      authorId: s.authorId,
      username: s.authorUsername,
      displayName: s.authorDisplayName,
      avatarUrl: s.authorAvatarUrl,
      stories: [],
    };
    g.stories.push(s);
    map.set(s.authorId, g);
  }
  // Mes stories d'abord, puis les stories non vues.
  return [...map.values()].sort((a, b) => {
    if (a.authorId === myId) return -1;
    if (b.authorId === myId) return 1;
    const aSeen = a.stories.every((s) => s.seen);
    const bSeen = b.stories.every((s) => s.seen);
    return Number(aSeen) - Number(bSeen);
  });
}

/** Rangée des stories (24 h) des comptes suivis, avec le bouton « Votre story ». */
export function StoriesRow() {
  const { user, profile } = useAuth();
  const fetchStories = useServerFn(listStories);
  const myAvatar = useAvatarUrl(profile?.avatar_url);
  const [open, setOpen] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["stories", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchStories(),
    // Les liens des médias de stories expirent vite (10 min) : on les renouvelle avant.
    staleTime: 4 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
  });
  const groups = useMemo(() => groupStories(query.data ?? [], user?.id), [query.data, user?.id]);
  const mine = groups.find((g) => g.authorId === user?.id);
  const others = groups.filter((g) => g.authorId !== user?.id);

  const bubble = "flex w-16 shrink-0 flex-col items-center gap-1";
  const label = "w-full truncate text-center text-[0.6875rem] text-foreground";

  return (
    <section aria-label="Stories" className="flex gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
      <div className={bubble}>
        <div className="relative">
          <button
            type="button"
            onClick={() => (mine ? setOpen(groups.indexOf(mine)) : undefined)}
            disabled={!mine}
            aria-label={mine ? "Voir votre story" : "Votre story"}
            className={cn("rounded-full p-0.5", mine ? "bg-brand" : "bg-border")}
          >
            <span className="block rounded-full bg-background p-0.5">
              <ProfileAvatar url={user ? (myAvatar.data ?? null) : null} alt="Votre avatar" size="md" />
            </span>
          </button>
          <Link
            to={user ? "/creer/story" : "/connexion"}
            aria-label="Créer une story"
            className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border-2 border-background bg-electric text-electric-foreground"
          >
            <Plus className="size-3.5" strokeWidth={3} />
          </Link>
        </div>
        <span className={label}>Votre story</span>
      </div>

      {query.isPending && user ? (
        <Loader2 className="my-auto size-5 animate-spin text-muted-foreground" />
      ) : (
        others.map((g) => {
          const seen = g.stories.every((s) => s.seen);
          return (
            <button key={g.authorId} type="button" onClick={() => setOpen(groups.indexOf(g))} className={bubble}>
              <span className={cn("rounded-full p-0.5", seen ? "bg-border" : "bg-brand")}>
                <span className="block rounded-full bg-background p-0.5">
                  <ProfileAvatar url={g.avatarUrl} alt={`Story de ${g.displayName}`} size="md" />
                </span>
              </span>
              <span className={label}>{g.displayName}</span>
            </button>
          );
        })
      )}

      {open !== null && groups[open] ? (
        <StoryViewer
          groups={groups}
          startGroup={open}
          myId={user?.id}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}

export function StoryViewer({
  groups,
  startGroup,
  startStory = 0,
  myId,
  onClose,
}: {
  groups: Group[];
  startGroup: number;
  startStory?: number;
  myId: string | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fetchViewers = useServerFn(listStoryViewers);
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(startStory);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const group = groups[gi];
  const story = group?.stories[si];
  const isMine = story?.authorId === myId;

  const viewers = useQuery({
    queryKey: ["story-viewers", story?.id],
    enabled: Boolean(story && isMine && showViewers),
    queryFn: () => fetchViewers({ data: { storyId: story!.id } }),
  });

  function next() {
    setShowViewers(false);
    if (!group) return onClose();
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }
  function prev() {
    setShowViewers(false);
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      const g = groups[gi - 1]!;
      setGi(gi - 1);
      setSi(g.stories.length - 1);
    }
  }

  // Vue enregistrée (sauf ses propres stories) + avance automatique.
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    if (!isMine && !story.seen) void supabase.rpc("record_story_view", { _story_id: story.id });
    if (story.mediaType === "video") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const p = (Date.now() - started) / IMAGE_STORY_MS;
      if (p >= 1) {
        window.clearInterval(timer);
        next();
      } else setProgress(p);
    }, 80);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, showViewers]);

  useEffect(() => {
    return () => void queryClient.invalidateQueries({ queryKey: ["stories"] });
  }, [queryClient]);

  async function handleDelete() {
    if (!story || !window.confirm("Supprimer cette story ?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (!error) {
      await supabase.storage.from("videos").remove([story.mediaPath]);
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      onClose();
    }
  }

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-card">
        {story.mediaUrl ? (
          story.mediaType === "video" ? (
            <video
              ref={videoRef}
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              onEnded={next}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <img src={story.mediaUrl} alt={`Story de ${group.displayName}`} className="absolute inset-0 size-full object-contain" />
          )
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Story indisponible.</p>
        )}

        {story.overlayText ? (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-background/60 px-4 py-3 text-center text-lg font-bold break-words text-foreground backdrop-blur-sm">
            {story.overlayText}
          </p>
        ) : null}

        {/* Zones de navigation */}
        <button type="button" aria-label="Story précédente" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label="Story suivante" onClick={next} className="absolute inset-y-0 right-0 w-1/3" />

        <div className="absolute inset-x-0 top-0 space-y-3 bg-gradient-to-b from-background/80 to-transparent p-3">
          <div className="flex gap-1">
            {group.stories.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-foreground/30">
                <span
                  className="block h-full bg-foreground"
                  style={{ width: `${i < si ? 100 : i === si ? Math.round(progress * 100) : 0}%` }}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ProfileAvatar url={group.avatarUrl} alt="" size="xs" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {group.displayName} <span className="font-normal text-foreground/70">· {timeAgo(story.createdAt)}</span>
            </p>
            {isMine ? (
              <button type="button" onClick={() => void handleDelete()} aria-label="Supprimer la story" className="text-foreground">
                <Trash2 className="size-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Fermer" className="text-foreground">
              <X className="size-6" />
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
          <button type="button" onClick={prev} aria-label="Précédente" className="text-foreground/70">
            <ChevronLeft className="size-6" />
          </button>
          {isMine ? (
            <button
              type="button"
              onClick={() => {
                videoRef.current?.pause();
                setShowViewers(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm"
            >
              <Eye className="size-4" /> {story.viewsCount ?? 0} vue{(story.viewsCount ?? 0) > 1 ? "s" : ""}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={next} aria-label="Suivante" className="text-foreground/70">
            <ChevronRight className="size-6" />
          </button>
        </div>

        {showViewers ? (
          <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Vues</h3>
              <button type="button" onClick={() => setShowViewers(false)} aria-label="Fermer la liste" className="text-muted-foreground">
                <X className="size-5" />
              </button>
            </div>
            {viewers.isPending ? (
              <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
            ) : viewers.isError ? (
              <p className="text-sm text-muted-foreground">{viewers.error.message}</p>
            ) : viewers.data?.length ? (
              <ul className="space-y-3">
                {viewers.data.map((v) => (
                  <li key={v.id} className="flex items-center gap-2.5">
                    <ProfileAvatar url={v.avatarUrl} alt="" size="xs" />
                    <span className="flex-1 truncate text-sm text-foreground">{v.displayName}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(v.viewedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Personne n'a encore vu cette story.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

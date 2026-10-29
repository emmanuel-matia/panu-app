import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VideoOverlayText, stopAllVideoPlayback } from "@/components/video/TrimmedVideo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listStories, type Story } from "@/lib/stories.functions";

const IMAGE_DURATION_MS = 5000;

type Author = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stories: Story[];
  allSeen: boolean;
};

function groupByAuthor(stories: Story[]): Author[] {
  const map = new Map<string, Author>();
  for (const story of stories) {
    const existing = map.get(story.authorId);
    if (existing) {
      existing.stories.push(story);
      existing.allSeen = existing.allSeen && story.seen;
      continue;
    }
    map.set(story.authorId, {
      id: story.authorId,
      username: story.authorUsername,
      displayName: story.authorDisplayName,
      avatarUrl: story.authorAvatarUrl,
      stories: [story],
      allSeen: story.seen,
    });
  }
  return [...map.values()];
}

/** Bandeau de stories (24 h) : consultation plein écran, progression automatique. */
export function StoryRail() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["stories", "active"],
    queryFn: () => listStories(),
    enabled: Boolean(session),
    staleTime: 30_000,
  });

  const authors = useMemo(() => groupByAuthor(query.data ?? []), [query.data]);
  const active = authors.find((author) => author.id === activeAuthorId) ?? null;

  const close = useCallback(() => {
    setActiveAuthorId(null);
    stopAllVideoPlayback();
    void queryClient.invalidateQueries({ queryKey: ["stories", "active"] });
  }, [queryClient]);

  if (!session || query.isError) return null;
  if (query.isPending) {
    return (
      <div className="flex gap-3 overflow-x-hidden px-4 py-3">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="size-16 shrink-0 animate-pulse rounded-full bg-surface" />
        ))}
      </div>
    );
  }
  if (authors.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {authors.map((author) => (
          <button
            key={author.id}
            type="button"
            onClick={() => setActiveAuthorId(author.id)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span
              className={`flex size-16 items-center justify-center rounded-full p-[2px] ${
                author.allSeen
                  ? "bg-border"
                  : "bg-gradient-to-tr from-electric via-gold to-destructive"
              }`}
            >
              <span className="flex size-full items-center justify-center rounded-full bg-background p-[2px]">
                <ProfileAvatar
                  url={author.avatarUrl}
                  alt={`Story de ${author.displayName}`}
                  size="sm"
                />
              </span>
            </span>
            <span className="w-full truncate text-center text-[0.6875rem] text-muted-foreground">
              {author.username}
            </span>
          </button>
        ))}
      </div>
      {active ? <StoryViewer author={active} onClose={close} /> : null}
    </>
  );
}

function StoryViewer({ author, onClose }: { author: Author; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const story = author.stories[Math.min(index, author.stories.length - 1)];

  const next = useCallback(() => {
    setIndex((current) => {
      if (current + 1 < author.stories.length) return current + 1;
      onClose();
      return current;
    });
  }, [author.stories.length, onClose]);

  const previous = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  // Le fil est mis en pause dès l'ouverture d'une story.
  useEffect(() => {
    stopAllVideoPlayback();
  }, []);

  useEffect(() => {
    if (!story) return;
    void supabase.rpc("record_story_view", { _story_id: story.id });
  }, [story]);

  // Avance automatique pour les images.
  useEffect(() => {
    if (!story || story.mediaType !== "image") return;
    const timer = window.setTimeout(next, IMAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [story, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  if (!story) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story de ${author.displayName}`}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur"
    >
      <div className="flex gap-1 px-3 pt-3">
        {author.stories.map((item, itemIndex) => (
          <span
            key={item.id}
            className={`h-0.5 flex-1 rounded-full ${
              itemIndex <= index ? "bg-foreground" : "bg-foreground/25"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2">
        <ProfileAvatar url={author.avatarUrl} alt={`Avatar de ${author.displayName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{author.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{author.username}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la story"
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {story.mediaUrl ? (
          story.mediaType === "video" ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              controls={false}
              onPlay={stopAllVideoPlayback}
              onEnded={next}
              className="absolute inset-0 size-full bg-background object-contain"
            />
          ) : (
            <img
              key={story.id}
              src={story.mediaUrl}
              alt={story.overlayText ?? `Story de ${author.displayName}`}
              className="absolute inset-0 size-full bg-background object-contain"
            />
          )
        ) : (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Story momentanément indisponible.
          </p>
        )}

        <VideoOverlayText text={story.overlayText} className="top-3" />

        {/* Zones de navigation : la moitié gauche revient en arrière. */}
        <button
          type="button"
          aria-label="Story précédente"
          onClick={previous}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          aria-label="Story suivante"
          onClick={next}
          className="absolute inset-y-0 right-0 w-2/3"
        />
      </div>
    </div>
  );
}

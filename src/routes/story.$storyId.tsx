import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { timeAgo } from "@/components/video/time";
import { useAuth } from "@/hooks/useAuth";
import { getSharedStory } from "@/lib/stories.functions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/story/$storyId")({
  // Côté serveur, le visiteur est anonyme : seuls le nom et l'avatar de l'auteur sont connus.
  loader: async ({ params }) => {
    if (!UUID.test(params.storyId)) return { author: null as null | { username: string; displayName: string } };
    const s = await getSharedStory({ data: { storyId: params.storyId } }).catch(() => null);
    return { author: s ? { username: s.authorUsername, displayName: s.authorDisplayName } : null };
  },
  head: ({ params, loaderData }) => {
    const url = `https://panu.site/story/${params.storyId}`;
    const a = loaderData?.author;
    const title = a ? `Story de ${a.displayName} (@${a.username}) sur PANU` : "Story — PANU";
    const description = a
      ? `Regardez la story de ${a.displayName} sur PANU. Les stories sont visibles 24 h par ses abonnés.`
      : "Une story partagée sur PANU, la plateforme africaine numérique.";
    const image = a ? `https://panu.site/api/public/og/profile/${encodeURIComponent(a.username)}` : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "PANU" },
        { name: "twitter:card", content: "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: StoryPage,
});

function StoryPage() {
  const { storyId } = Route.useParams();
  const { user, loading } = useAuth();
  const fetchStory = useServerFn(getSharedStory);
  const query = useQuery({
    queryKey: ["shared-story", storyId, user?.id ?? "anon"],
    enabled: UUID.test(storyId) && !loading,
    queryFn: () => fetchStory({ data: { storyId } }),
    staleTime: 4 * 60 * 1000,
  });
  const story = query.data;

  return (
    <AppShell title="Story">
      <div className="px-3 py-3">
        {!UUID.test(storyId) ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Lien de story invalide.</p>
        ) : query.isPending ? (
          <Loader2 className="mx-auto my-16 size-6 animate-spin text-muted-foreground" />
        ) : !story ? (
          <Empty title="Story introuvable" text="Elle a peut-être été supprimée par son auteur." />
        ) : (
          <div className="space-y-3">
            <Link
              to="/@{$username}"
              params={{ username: story.authorUsername }}
              className="flex items-center gap-2.5"
            >
              <ProfileAvatar url={story.authorAvatarUrl} alt={`Avatar de ${story.authorDisplayName}`} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{story.authorDisplayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{story.authorUsername} · {timeAgo(story.createdAt)}
                </span>
              </span>
            </Link>
            {story.canView && story.mediaUrl ? (
              <div className="relative h-[calc(100dvh-14rem)] min-h-[24rem] overflow-hidden rounded-3xl border border-border bg-card">
                {story.mediaType === "video" ? (
                  <video
                    src={story.mediaUrl}
                    autoPlay
                    muted
                    playsInline
                    controls
                    className="absolute inset-0 size-full object-contain"
                  />
                ) : (
                  <img
                    src={story.mediaUrl}
                    alt={`Story de ${story.authorDisplayName}`}
                    className="absolute inset-0 size-full object-contain"
                  />
                )}
                {story.overlayText ? (
                  <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-background/60 px-4 py-3 text-center text-lg font-bold break-words text-foreground">
                    {story.overlayText}
                  </p>
                ) : null}
              </div>
            ) : story.expired ? (
              <Empty title="Story expirée" text="Les stories ne restent visibles que 24 heures." />
            ) : !user ? (
              <Empty
                title="Connectez-vous pour voir cette story"
                text={`Les stories de ${story.authorDisplayName} sont réservées à ses abonnés.`}
                action={
                  <Link to="/connexion">
                    <ActionButton>Se connecter</ActionButton>
                  </Link>
                }
              />
            ) : (
              <Empty
                title="Story réservée aux abonnés"
                text={`Suivez ${story.authorDisplayName} pour voir ses stories.`}
                action={
                  <Link to="/@{$username}" params={{ username: story.authorUsername }}>
                    <ActionButton>Voir le profil</ActionButton>
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-12 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

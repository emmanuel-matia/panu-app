import { createFileRoute, Link } from "@tanstack/react-router";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPostList } from "@/components/video/VideoPostList";

export const Route = createFileRoute("/p/$postId")({
  head: () => ({
    meta: [
      { title: "Publication — PANU" },
      { name: "description", content: "Une publication partagée sur PANU, la plateforme africaine numérique." },
      { property: "og:title", content: "Publication — PANU" },
      { property: "og:description", content: "Regardez cette publication sur PANU." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PostPage() {
  const { postId } = Route.useParams();
  const valid = UUID.test(postId);
  return (
    <AppShell title="Publication">
      {valid ? (
        <VideoPostList
          postId={postId}
          emptyTitle="Publication introuvable"
          emptyDescription="Elle a peut-être été supprimée par son créateur."
          emptyAction={
            <Link to="/">
              <ActionButton>Voir le fil PANU</ActionButton>
            </Link>
          }
        />
      ) : (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">Lien de publication invalide.</p>
      )}
    </AppShell>
  );
}

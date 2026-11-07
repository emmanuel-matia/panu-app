import { createFileRoute, Link } from "@tanstack/react-router";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPostList } from "@/components/video/VideoPostList";

export const Route = createFileRoute("/p/$postId")({
  loader: async ({ params }) => {
    if (!UUID.test(params.postId)) return { post: null };
    const posts = await listPosts({ data: { postId: params.postId } }).catch(() => []);
    return { post: posts[0] ?? null };
  },
  head: ({ params, loaderData }) => {
    const url = `https://panu.site/p/${params.postId}`;
    const post = loaderData?.post;
    if (!post) {
      return {
        meta: [
          { title: "Publication — PANU" },
          { name: "description", content: "Une publication partagée sur PANU, la plateforme africaine numérique." },
          { property: "og:title", content: "Publication — PANU" },
          { property: "og:description", content: "Regardez cette publication sur PANU." },
          { property: "og:type", content: "website" },
          { property: "og:url", content: url },
          { name: "twitter:card", content: "summary" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${post.title} — @${post.authorUsername} sur PANU`;
    const description = shareDescription(post);
    const hasImage = Boolean(shareImageUrl(post));
    const image = `https://panu.site/api/public/og/${post.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: post.kind === "video" ? "video.other" : "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "PANU" },
        { name: "twitter:card", content: hasImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(hasImage
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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

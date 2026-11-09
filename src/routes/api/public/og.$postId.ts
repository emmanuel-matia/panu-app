import { createFileRoute } from "@tanstack/react-router";

import { listPosts } from "@/lib/posts.functions";
import { shareImageUrl } from "@/lib/share-rules";
import { fallbackShareImage, proxyImage } from "@/lib/share-settings.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Image d'aperçu stable : redirige vers un lien signé neuf (les liens signés expirent).
// Ne sert que les publications visibles publiquement via list_posts.
export const Route = createFileRoute("/api/public/og/$postId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.postId)) return new Response("Not found", { status: 404 });
        const posts = await listPosts({ data: { postId: params.postId } }).catch(() => []);
        const img = posts[0] ? shareImageUrl(posts[0]) : null;
        return proxyImage(img ?? (posts[0] ? await fallbackShareImage() : null));
      },
    },
  },
});

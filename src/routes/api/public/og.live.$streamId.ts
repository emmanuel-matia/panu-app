import { createFileRoute } from "@tanstack/react-router";

import { publicLives } from "@/lib/live.functions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Image d'aperçu d'un direct : miniature (ou photo du créateur) re-signée à chaque demande.
// Seuls les directs visibles publiquement via get_live_public sont servis.
export const Route = createFileRoute("/api/public/og/live/$streamId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.streamId)) return new Response("Not found", { status: 404 });
        const rows = await publicLives({ data: { streamId: params.streamId } }).catch(() => []);
        const img = rows[0]?.coverUrl ?? rows[0]?.hostAvatarUrl ?? null;
        if (!img) return new Response("Not found", { status: 404 });
        return new Response(null, { status: 302, headers: { Location: img, "Cache-Control": "public, max-age=300" } });
      },
    },
  },
});

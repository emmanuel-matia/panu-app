import { createFileRoute } from "@tanstack/react-router";

import { getPublicProfile } from "@/lib/profiles.functions";
import { fallbackShareImage, proxyImage } from "@/lib/share-settings.server";

// Photo de profil pour la carte de partage (profils publics uniquement), sinon image par défaut.
export const Route = createFileRoute("/api/public/og/profile/$username")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const p = await getPublicProfile({ data: { username: params.username.slice(0, 64) } }).catch(() => null);
        if (!p) return new Response("Not found", { status: 404 });
        return proxyImage(p.avatarUrl ?? (await fallbackShareImage()));
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { proxyImage, readShareSettings, signSettingImage } from "@/lib/share-settings.server";

// Logo PANU et image de partage par défaut, réglés depuis l'administration.
export const Route = createFileRoute("/api/public/og/site/$kind")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (params.kind !== "logo" && params.kind !== "default") return new Response("Not found", { status: 404 });
        const s = await readShareSettings();
        const path = params.kind === "logo" ? s.logoPath : (s.defaultImagePath ?? s.logoPath);
        return proxyImage(await signSettingImage(path));
      },
    },
  },
});

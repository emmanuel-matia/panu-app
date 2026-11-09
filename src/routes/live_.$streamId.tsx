import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { LiveViewer } from "@/components/live/LiveViewer";
import { publicLives } from "@/lib/live.functions";
import { liveShareTitle } from "@/lib/live-rules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/live_/$streamId")({
  loader: async ({ params }) => {
    if (!UUID.test(params.streamId)) return { live: null };
    const rows = await publicLives({ data: { streamId: params.streamId } }).catch(() => []);
    return { live: rows[0] ?? null };
  },
  head: ({ params, loaderData }) => {
    const url = `https://panu.site/live/${params.streamId}`;
    const live = loaderData?.live;
    if (!live) {
      return {
        meta: [
          { title: "Direct — PANU" },
          { name: "description", content: "Un direct partagé sur PANU." },
          { property: "og:title", content: "Direct — PANU" },
          { property: "og:description", content: "Regardez les directs des créateurs PANU." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = liveShareTitle(live);
    const description = `${live.status === "ended" ? "Direct terminé" : `${live.viewersCount} spectateur(s) en ce moment`} · @${live.hostUsername} sur PANU — panu.site`;
    const image = live.coverUrl || live.hostAvatarUrl ? `https://panu.site/api/public/og/live/${live.id}` : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.other" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "PANU" },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
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
  component: LiveWatchPage,
});

function LiveWatchPage() {
  const { live } = Route.useLoaderData();
  return (
    <AppShell title="LIVE" subtitle={live ? live.hostDisplayName : "Direct"}>
      {live ? (
        <LiveViewer key={live.id} initial={live} />
      ) : (
        <EmptyState
          icon={Radio}
          title="Direct introuvable"
          description="Ce direct n'existe pas ou n'est plus accessible."
          action={
            <Link to="/live">
              <ActionButton>Voir les directs</ActionButton>
            </Link>
          }
        />
      )}
    </AppShell>
  );
}

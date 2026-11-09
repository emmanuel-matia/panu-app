import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { LiveStudio } from "@/components/live/LiveStudio";

export const Route = createFileRoute("/_authenticated/studio-live")({
  head: () => ({
    meta: [
      { title: "Studio Live — PANU" },
      { name: "description", content: "Lancez un direct PANU depuis votre téléphone." },
      { property: "og:title", content: "Studio Live — PANU" },
      { property: "og:description", content: "Lancez un direct PANU depuis votre téléphone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioLivePage,
});

function StudioLivePage() {
  return (
    <AppShell title="LIVE" subtitle="Studio">
      <LiveStudio />
    </AppShell>
  );
}

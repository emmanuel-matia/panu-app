import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "LIVE — PANU" },
      { name: "description", content: "Les diffusions en direct des créateurs PANU." },
      { property: "og:title", content: "LIVE — PANU" },
      { property: "og:description", content: "Les diffusions en direct des créateurs PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  return (
    <AppShell title="LIVE" subtitle="En direct">
      <EmptyState
        icon={Radio}
        title="Aucun live en cours"
        description="Les diffusions en direct arrivent dans une prochaine étape. En attendant, publiez vos vidéos et vos stories."
        action={
          <Link to="/creer">
            <ActionButton>Créer une publication</ActionButton>
          </Link>
        }
      />
    </AppShell>
  );
}

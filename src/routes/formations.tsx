import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/formations")({
  head: () => ({
    meta: [
      { title: "Formations — PANU Academy" },
      { name: "description", content: "Apprenez de nouvelles compétences avec les formations des créateurs PANU." },
      { property: "og:title", content: "Formations — PANU Academy" },
      { property: "og:description", content: "Les formations des créateurs PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormationsPage,
});

function FormationsPage() {
  return (
    <AppShell title="Formations" subtitle="PANU Academy">
      <EmptyState
        icon={GraduationCap}
        title="Aucune formation pour le moment"
        description="PANU Academy ouvrira dans une prochaine étape. Les cours des créateurs apparaîtront ici."
        action={
          <Link to="/">
            <ActionButton variant="outline">Retour à l'accueil</ActionButton>
          </Link>
        }
      />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — PANU" },
      {
        name: "description",
        content: "Suivez l'activité réelle de votre compte PANU : mentions, abonnements et alertes.",
      },
      { property: "og:title", content: "Notifications — PANU" },
      { property: "og:description", content: "L'activité réelle de votre compte PANU." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell title="Notifications" subtitle="Activité">
      <EmptyState
        icon={Bell}
        title="Aucune notification"
        description="L'activité réelle de votre compte apparaîtra ici. Rien n'est simulé."
      />
    </AppShell>
  );
}

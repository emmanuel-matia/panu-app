import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — PANU" },
      {
        name: "description",
        content: "Vos conversations privées sur PANU, dans un espace sécurisé.",
      },
      { property: "og:title", content: "Messages — PANU" },
      { property: "og:description", content: "Vos conversations privées sur PANU." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <AppShell title="Messages" subtitle="Conversations">
      <EmptyState
        icon={MessageCircle}
        title="Aucune conversation"
        description="Vos échanges avec les créateurs et vos contacts apparaîtront ici."
      />
    </AppShell>
  );
}

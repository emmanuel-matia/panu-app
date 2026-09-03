import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, Bell } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PANU — Créez. Partagez. Apprenez. Achetez. Gagnez." },
      {
        name: "description",
        content:
          "PANU, la plateforme africaine numérique : créer, partager, apprendre, acheter et gagner dans un seul espace.",
      },
      { property: "og:title", content: "PANU — Plateforme Africaine Numérique" },
      {
        property: "og:description",
        content: "Un écosystème africain pour créer, partager, apprendre et monétiser.",
      },
    ],
  }),
  component: AccueilPage,
});

const onglets = ["Pour toi", "Abonnements", "Tendances"] as const;

function AccueilPage() {
  const { session, profile, loading } = useAuth();

  return (
    <AppShell
      title="PANU"
      subtitle="Accueil"
      headerAction={
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <Bell className="size-4" strokeWidth={1.75} />
          </Link>
          {loading ? null : session ? (
            <Link
              to="/profil"
              className="flex size-9 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground"
              aria-label="Mon profil"
            >
              {(profile?.display_name ?? profile?.username ?? "?").slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <Link
              to="/connexion"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              Se connecter
            </Link>
          )}
        </div>
      }
    >
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
        {onglets.map((onglet, index) => (
          <span
            key={onglet}
            className={
              index === 0
                ? "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
            }
          >
            {onglet}
          </span>
        ))}
      </div>

      <EmptyState
        icon={LayoutGrid}
        title="Aucun contenu pour le moment"
        description="Les publications des créateurs que vous suivez apparaîtront ici."
        action={
          <Link to="/explorer">
            <ActionButton>Explorer PANU</ActionButton>
          </Link>
        }
      />
    </AppShell>
  );
}

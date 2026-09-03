import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, UserCircle2 } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil — PANU" },
      {
        name: "description",
        content: "Votre profil PANU : contenus, audience et statistiques réelles uniquement.",
      },
      { property: "og:title", content: "Profil — PANU" },
      { property: "og:description", content: "Votre profil de créateur sur PANU." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  return (
    <AppShell
      title="Profil"
      headerAction={
        <Link
          to="/parametres"
          aria-label="Paramètres"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <Settings className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <EmptyState
        icon={UserCircle2}
        title="Aucun profil sélectionné"
        description="Connectez-vous pour afficher votre profil, ou recherchez un utilisateur."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/connexion">
              <ActionButton>Se connecter</ActionButton>
            </Link>
            <Link to="/explorer">
              <ActionButton variant="outline">Rechercher</ActionButton>
            </Link>
          </div>
        }
      />
    </AppShell>
  );
}

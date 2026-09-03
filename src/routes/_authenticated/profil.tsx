import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, UserCircle2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, profile, loading } = useAuth();

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
      {loading ? (
        <div className="px-4 py-6">
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
        </div>
      ) : profile ? (
        <>
          <section className="flex items-center gap-4 px-4 py-6">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`Avatar de ${profile.display_name}`}
                  className="size-full object-cover"
                />
              ) : (
                <UserCircle2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {profile.display_name}
              </h2>
              <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </section>

          {profile.bio ? (
            <p className="px-4 pb-4 text-sm text-surface-foreground">{profile.bio}</p>
          ) : (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              Aucune biographie pour le moment.
            </p>
          )}

          <EmptyState
            icon={UserCircle2}
            title="Aucune publication"
            description="Vos contenus apparaîtront ici dès que la publication sera activée."
          />
        </>
      ) : (
        <EmptyState
          icon={UserCircle2}
          title="Profil indisponible"
          description="Nous n'avons pas pu charger votre profil. Réessayez dans un instant."
        />
      )}
    </AppShell>
  );
}

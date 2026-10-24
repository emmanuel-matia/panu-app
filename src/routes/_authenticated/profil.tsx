import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, PencilLine, Settings, UserCircle2 } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { VideoPostList } from "@/components/video/VideoPostList";
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
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url);

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
            <ProfileAvatar url={avatarUrl} alt={`Avatar de ${profile.display_name}`} size="md" />
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
            <p className="px-4 pb-4 text-sm whitespace-pre-line text-surface-foreground">
              {profile.bio}
            </p>
          ) : (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              Aucune biographie pour le moment.
            </p>
          )}

          <div className="flex gap-2 px-4 pb-4">
            <Link
              to="/profil/modifier"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground"
            >
              <PencilLine className="size-4" strokeWidth={1.75} />
              Modifier
            </Link>
            <Link
              to="/@{$username}"
              params={{ username: profile.username }}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-semibold text-surface-foreground"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} />
              Profil public
            </Link>
          </div>

          <div className="border-t border-border">
            <VideoPostList
              authorId={profile.id}
              emptyTitle="Aucune publication"
              emptyDescription="Vos vidéos publiées apparaîtront ici."
              emptyAction={
                <Link to="/creer/video">
                  <ActionButton>Publier une vidéo</ActionButton>
                </Link>
              }
            />
          </div>
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

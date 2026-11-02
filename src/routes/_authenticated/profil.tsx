import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, MapPin, PencilLine, Settings, UserCircle2 } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { publicProfileKey } from "@/components/profile/FollowButton";
import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { useAuth } from "@/hooks/useAuth";
import { getPublicProfile } from "@/lib/profiles.functions";

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
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { user, profile, loading } = useAuth();
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url);
  const stats = useQuery({
    queryKey: publicProfileKey(profile?.username ?? ""),
    enabled: Boolean(profile?.username),
    queryFn: () => getPublicProfile({ data: { username: profile!.username } }),
  });

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
          <div className="h-28 w-full overflow-hidden bg-surface-gradient">
            {stats.data?.coverUrl ? (
              <img src={stats.data.coverUrl} alt="Votre photo de couverture" className="size-full object-cover" />
            ) : null}
          </div>
          <section className="px-4 pb-4">
            <div className="-mt-9 flex items-end gap-4">
              <ProfileAvatar url={avatarUrl} alt={`Avatar de ${profile.display_name}`} size="xl" />
              <div className="min-w-0 pb-1">
                <h2 className="truncate font-display text-lg font-semibold text-foreground">
                  {profile.display_name}
                </h2>
                <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            {user?.email ? <p className="mt-2 truncate text-xs text-muted-foreground">{user.email}</p> : null}
            {profile.location ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" strokeWidth={1.75} /> {profile.location}
              </p>
            ) : null}
            <div className="mt-3 flex gap-5 text-sm" aria-live="polite">
              <span>
                <strong className="font-display text-foreground">{stats.data?.followersCount ?? "–"}</strong>{" "}
                <span className="text-muted-foreground">abonnés</span>
              </span>
              <span>
                <strong className="font-display text-foreground">{stats.data?.followingCount ?? "–"}</strong>{" "}
                <span className="text-muted-foreground">abonnements</span>
              </span>
            </div>
            {profile.bio ? (
              <p className="mt-3 text-sm whitespace-pre-line text-surface-foreground">{profile.bio}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Aucune biographie pour le moment.</p>
            )}
          </section>

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

          <ProfileTabs
            profileId={profile.id}
            isOwner
            ownerActions={{
              publications: (
                <Link to="/creer">
                  <ActionButton>Créer une publication</ActionButton>
                </Link>
              ),
              videos: (
                <Link to="/creer/video">
                  <ActionButton>Publier une vidéo</ActionButton>
                </Link>
              ),
              photos: (
                <Link to="/creer">
                  <ActionButton>Publier une image</ActionButton>
                </Link>
              ),
              stories: (
                <Link to="/creer/story">
                  <ActionButton>Créer une story</ActionButton>
                </Link>
              ),
            }}
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

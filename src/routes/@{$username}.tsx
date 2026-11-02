import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { PencilLine, UserX } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { BlockButton } from "@/components/profile/BlockButton";
import { FollowButton, publicProfileKey } from "@/components/profile/FollowButton";
import { ProfileDetails } from "@/components/profile/ProfileDetails";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { useAuth } from "@/hooks/useAuth";
import { canEditProfile } from "@/lib/profile-rules";
import { getPublicProfile } from "@/lib/profiles.functions";

export const publicProfileQuery = (username: string) =>
  queryOptions({
    queryKey: publicProfileKey(username),
    queryFn: async () => {
      const profile = await getPublicProfile({ data: { username } });
      if (!profile) throw notFound();
      return profile;
    },
  });

export const Route = createFileRoute("/@{$username}")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(publicProfileQuery(params.username)),
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Profil introuvable — PANU" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.displayName} (@${loaderData.username}) — PANU`;
    const description =
      loaderData.bio?.slice(0, 155) ?? `Découvrez le profil de @${params.username} sur PANU.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PublicProfilePage,
  errorComponent: ProfileError,
  notFoundComponent: ProfileNotFound,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { data: profile } = useSuspenseQuery(publicProfileQuery(username));
  const { user } = useAuth();
  const isOwner = canEditProfile(user?.id, profile.id);

  return (
    <AppShell title={profile.displayName} subtitle={`@${profile.username}`}>
      <div className="h-32 w-full overflow-hidden bg-surface-gradient">
        {profile.coverUrl ? (
          <img
            src={profile.coverUrl}
            alt={`Couverture de ${profile.displayName}`}
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <section className="px-4 pb-4">
        <div className="-mt-10 flex items-start gap-4">
          <ProfileAvatar
            url={profile.avatarUrl}
            alt={`Avatar de ${profile.displayName}`}
            size="xl"
          />
          <div className="min-w-0 flex-1 pt-11">
            <h2 className="truncate font-display text-xl font-semibold text-foreground">
              {profile.displayName}
            </h2>
            <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        <ProfileDetails
          username={profile.username}
          createdAt={profile.createdAt}
          location={[profile.city, profile.country].filter(Boolean).join(", ") || null}
          website={profile.website}
          socialLinks={profile.socialLinks}
          postsCount={profile.postsCount}
          followersCount={profile.followersCount}
          followingCount={profile.followingCount}
          isFounder={profile.isFounder}
          isProfessional={profile.isProfessional}
          isLocked={profile.isLocked}
          online={profile.online}
          countsLinkable={isOwner}
        />

        {profile.bio ? (
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-surface-foreground">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Aucune biographie pour le moment.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {isOwner ? (
            <Link
              to="/profil/modifier"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-semibold text-surface-foreground transition-colors hover:bg-muted"
            >
              <PencilLine className="size-4" strokeWidth={1.75} />
              Modifier le profil
            </Link>
          ) : profile.followPolicy === "nobody" ? (
            <p className="flex-1 text-sm text-muted-foreground">Ce compte n'accepte pas de nouveaux abonnés.</p>
          ) : (
            <div className="min-w-32 flex-1">
              <FollowButton profileId={profile.id} username={profile.username} />
            </div>
          )}
          <ShareProfileButton username={profile.username} displayName={profile.displayName} label="Partager" />
          {isOwner ? null : <BlockButton profileId={profile.id} username={profile.username} />}
        </div>
      </section>

      <ProfileTabs profileId={profile.id} isOwner={isOwner} />
    </AppShell>
  );
}

function ProfileNotFound() {
  const { username } = Route.useParams();
  return (
    <AppShell title="Profil introuvable">
      <EmptyState
        icon={UserX}
        title={`@${username} n'existe pas`}
        description="Ce nom d'utilisateur ne correspond à aucun compte PANU."
      />
    </AppShell>
  );
}

function ProfileError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <AppShell title="Profil">
      <div role="alert" className="px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Impossible de charger ce profil."}
        </p>
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    </AppShell>
  );
}

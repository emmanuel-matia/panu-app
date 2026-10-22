import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { CalendarDays, PencilLine, UserCircle2, UserX } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { canEditProfile } from "@/lib/profile-rules";
import { getPublicProfile } from "@/lib/profiles.functions";

export const publicProfileQuery = (username: string) =>
  queryOptions({
    queryKey: ["public-profile", username.toLowerCase()],
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

function formatJoined(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { data: profile } = useSuspenseQuery(publicProfileQuery(username));
  const { user } = useAuth();
  const isOwner = canEditProfile(user?.id, profile.id);

  return (
    <AppShell title={profile.displayName} subtitle={`@${profile.username}`}>
      <section className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <ProfileAvatar
            url={profile.avatarUrl}
            alt={`Avatar de ${profile.displayName}`}
            size="xl"
          />
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="truncate font-display text-xl font-semibold text-foreground">
              {profile.displayName}
            </h2>
            <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" strokeWidth={1.75} />
              Membre depuis {formatJoined(profile.createdAt)}
            </p>
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-surface-foreground">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Aucune biographie pour le moment.</p>
        )}

        {isOwner ? (
          <Link
            to="/profil/modifier"
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-semibold text-surface-foreground transition-colors hover:bg-muted"
          >
            <PencilLine className="size-4" strokeWidth={1.75} />
            Modifier le profil
          </Link>
        ) : null}
      </section>

      <div className="border-t border-border">
        <EmptyState
          icon={UserCircle2}
          title="Aucune publication"
          description="Les contenus de ce profil apparaîtront ici dès que la publication sera activée."
        />
      </div>
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

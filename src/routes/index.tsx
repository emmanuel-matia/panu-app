import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, MessageCircle, Search } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { StoryRail } from "@/components/stories/StoryRail";
import { VideoPostList, type FeedMode } from "@/components/video/VideoPostList";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccueilPage,
});

const onglets: { label: string; mode: FeedMode }[] = [
  { label: "Pour toi", mode: "recent" },
  { label: "Abonnements", mode: "following" },
  { label: "Tendances", mode: "trending" },
];

const iconLink =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted";

function HomeHeader({
  mode,
  onModeChange,
}: {
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}) {
  const { session, profile, loading } = useAuth();
  const avatar = useAvatarUrl(profile?.avatar_url);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pt-3 pb-2 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-none font-bold tracking-tight text-foreground">
            P<span className="text-electric">A</span>NU
          </h1>
          <p className="mt-1 truncate text-[0.6875rem] tracking-wide text-muted-foreground">
            Crée · Partage · Gagne
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/explorer" aria-label="Rechercher" className={iconLink}>
            <Search className="size-[1.125rem]" strokeWidth={1.75} />
          </Link>
          <Link to="/notifications" aria-label="Notifications" className={iconLink}>
            <Bell className="size-[1.125rem]" strokeWidth={1.75} />
          </Link>
          <Link to="/messages" aria-label="Messages privés" className={iconLink}>
            <MessageCircle className="size-[1.125rem]" strokeWidth={1.75} />
          </Link>
          {loading ? (
            <span className="size-10 shrink-0 rounded-full border border-border" />
          ) : session ? (
            <Link to="/profil" aria-label="Mon profil" className="shrink-0 rounded-full">
              <ProfileAvatar
                url={avatar.data ?? null}
                alt={`Avatar de ${profile?.display_name ?? "mon profil"}`}
                size="sm"
              />
            </Link>
          ) : (
            <Link
              to="/connexion"
              className="shrink-0 rounded-full bg-electric px-3 py-2 text-xs font-semibold text-electric-foreground"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Filtrer le fil"
        className="mx-auto mt-3 flex w-full max-w-2xl gap-2 overflow-x-auto"
      >
        {onglets.map((onglet) => (
          <button
            key={onglet.mode}
            type="button"
            role="tab"
            aria-selected={mode === onglet.mode}
            onClick={() => onModeChange(onglet.mode)}
            className={
              mode === onglet.mode
                ? "shrink-0 rounded-full bg-electric px-4 py-1.5 text-sm font-semibold text-electric-foreground"
                : "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {onglet.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function AccueilPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<FeedMode>("recent");
  const requiresAuth = mode === "following" && !session;

  return (
    <AppShell title="PANU" header={<HomeHeader mode={mode} onModeChange={setMode} />}>
      <StoryRail />
      {requiresAuth ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour retrouver les vidéos des personnes que vous suivez.
          </p>
          <Link to="/connexion" className="mt-4 inline-block">
            <ActionButton>Se connecter</ActionButton>
          </Link>
        </div>
      ) : (
        <VideoPostList
          key={mode}
          mode={mode}
          emptyTitle={
            mode === "following" ? "Votre fil d'abonnements est vide" : "Aucun contenu pour le moment"
          }
          emptyDescription={
            mode === "following"
              ? "Suivez des créateurs pour retrouver leurs vidéos ici."
              : "Les vidéos publiées sur PANU apparaîtront ici."
          }
          emptyAction={
            <Link to="/explorer">
              <ActionButton>Explorer PANU</ActionButton>
            </Link>
          }
        />
      )}
    </AppShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { ActionButton } from "@/components/common/ActionButton";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeShortcuts } from "@/components/home/HomeShortcuts";
import { LiveNowRow } from "@/components/home/LiveNowRow";
import { StoriesRow } from "@/components/home/StoriesRow";
import { SuggestionsRow } from "@/components/home/SuggestionsRow";
import { StudioIaBar } from "@/components/home/StudioIaBar";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPostList } from "@/components/video/VideoPostList";
import { useAuth } from "@/hooks/useAuth";
import { DISCOVER_KEY } from "@/lib/discover";

export const Route = createFileRoute("/")({
  validateSearch: z.object({ fil: z.enum(["tendances"]).optional() }),
  head: () => ({
    meta: [
      { title: "PANU — Créez. Partagez. Apprenez. Achetez. Gagnez." },
      {
        name: "description",
        content:
          "PANU, la plateforme africaine numérique : vidéos, stories, Studio IA, live et marketplace dans un seul espace.",
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

function AccueilPage() {
  const { fil } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const trending = fil === "tendances";

  // Premier passage d'un visiteur : écran de bienvenue (sauf s'il a choisi de découvrir d'abord).
  useEffect(() => {
    if (loading || session) return;
    if (window.localStorage.getItem(DISCOVER_KEY) !== "1") {
      void navigate({ to: "/bienvenue", replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <AppShell title="PANU" header={<HomeHeader />}>
      <div className="snap-start scroll-mt-20">
        <StoriesRow />
        <LiveNowRow />
        <StudioIaBar />
        <SuggestionsRow />
        <HomeShortcuts trending={trending} />
      </div>
      <VideoPostList
        mode={trending ? "trending" : "recent"}
        emptyTitle={trending ? "Aucune tendance pour le moment" : "Aucun contenu pour le moment"}
        emptyDescription={
          trending
            ? "Les publications les plus vues et aimées des 30 derniers jours apparaîtront ici."
            : "Les publications de la communauté PANU apparaîtront ici. Soyez le premier à publier !"
        }
        emptyAction={
          <Link to="/creer">
            <ActionButton>Créer une publication</ActionButton>
          </Link>
        }
      />
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Video, Image, Clapperboard, Music, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/creer")({
  head: () => ({
    meta: [
      { title: "Créer — PANU Studio" },
      {
        name: "description",
        content:
          "Choisissez ce que vous voulez créer sur PANU : vidéo, image, story, audio ou création assistée par IA.",
      },
      { property: "og:title", content: "Créer — PANU Studio" },
      {
        property: "og:description",
        content: "Des outils puissants pour réaliser vos idées sur PANU.",
      },
    ],
  }),
  component: CreerPage,
});

const options = [
  { icon: Video, titre: "Vidéo", detail: "Créer et éditer vos vidéos" },
  { icon: Image, titre: "Image / Design", detail: "Affiches, posts, visuels" },
  { icon: Clapperboard, titre: "Story", detail: "Stories éphémères" },
  { icon: Music, titre: "Audio", detail: "Podcasts, musiques" },
  { icon: Sparkles, titre: "Studio IA", detail: "Créer avec l'intelligence artificielle" },
] as const;

function CreerPage() {
  return (
    <AppShell title="Créer" subtitle="Que voulez-vous créer ?">
      <div className="space-y-3 px-4 py-5">
        {options.map(({ icon: Icon, titre, detail }) => {
          const content = (
            <>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-accent">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{titre}</span>
                <span className="block truncate text-xs text-muted-foreground">{detail}</span>
              </span>
            </>
          );
          const className =
            "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-gradient px-4 py-3.5 text-left disabled:opacity-70";
          return titre === "Vidéo" ? (
            <Link key={titre} to="/creer/video" className={`${className} transition-colors hover:border-primary/60`}>
              {content}
            </Link>
          ) : (
            <button key={titre} type="button" disabled className={className}>
              {content}
            </button>
          );
        })}
      </div>
      <p className="px-6 pb-8 text-center text-xs text-muted-foreground">
        Des outils puissants pour réaliser vos idées. Ces modules seront activés
        progressivement.
      </p>
    </AppShell>
  );
}

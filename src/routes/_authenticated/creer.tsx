import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Image, Mic, Music, PenLine, Sparkles, Video } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/creer")({
  head: () => ({
    meta: [
      { title: "Créer — PANU Studio" },
      {
        name: "description",
        content:
          "Choisissez ce que vous voulez créer sur PANU : vidéo, story, image, musique, voix ou texte avec l'IA.",
      },
      { property: "og:title", content: "Créer — PANU Studio" },
      { property: "og:description", content: "Des outils puissants pour réaliser vos idées sur PANU." },
    ],
  }),
  component: CreerPage,
});

const className =
  "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-gradient px-4 py-3.5 text-left transition-colors hover:border-primary/60";

function Item({ icon: Icon, titre, detail }: { icon: typeof Video; titre: string; detail: string }) {
  return (
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
}

function CreerPage() {
  return (
    <AppShell title="Créer" subtitle="Que voulez-vous créer ?">
      <div className="space-y-3 px-4 py-5">
        <Link to="/creer/video" className={className}>
          <Item icon={Video} titre="Vidéo" detail="Importer, découper et publier une vidéo" />
        </Link>
        <Link to="/creer/story" className={className}>
          <Item icon={Clapperboard} titre="Story" detail="Photo ou vidéo visible 24 h" />
        </Link>
        <Link to="/creer/video" search={{ mode: "ai" }} className={className}>
          <Item icon={Sparkles} titre="Studio IA" detail="Vidéo, image, musique, voix et texte" />
        </Link>
        <Link to="/creer/video" search={{ mode: "ai", outil: "image" }} className={className}>
          <Item icon={Image} titre="Image IA" detail="Affiches, posts, visuels" />
        </Link>
        <Link to="/creer/video" search={{ mode: "ai", outil: "musique" }} className={className}>
          <Item icon={Music} titre="Musique IA" detail="Instrumentaux et ambiances" />
        </Link>
        <Link to="/creer/video" search={{ mode: "ai", outil: "voix" }} className={className}>
          <Item icon={Mic} titre="Voix IA" detail="Voix off à partir d'un texte" />
        </Link>
        <Link to="/creer/video" search={{ mode: "ai", outil: "texte" }} className={className}>
          <Item icon={PenLine} titre="Texte IA" detail="Publications, hashtags, scénarios" />
        </Link>
      </div>
    </AppShell>
  );
}

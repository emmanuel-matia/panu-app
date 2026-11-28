import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Clapperboard, FolderOpen, Image, Music, PenLine, Plus, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/common/ActionButton";
import { CreationDrafts } from "@/components/create/CreationDrafts";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/creer")({
  head: () => ({
    meta: [
      { title: "Créer — PANU" },
      {
        name: "description",
        content:
          "Publiez vos vidéos, photos, textes et stories. Retrouvez vos brouillons et le Studio IA indépendant.",
      },
      { property: "og:title", content: "Créer — PANU Studio" },
      { property: "og:description", content: "Des outils puissants pour réaliser vos idées sur PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreerPage,
});

const className =
  "flex min-w-0 flex-col items-center gap-2 rounded-lg py-3 text-center transition-colors hover:bg-muted";

function Item({ icon: Icon, titre, detail }: { icon: typeof Video; titre: string; detail: string }) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-accent">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 w-full">
        <span className="block text-sm font-semibold text-foreground">{titre}</span>
        {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
      </span>
    </>
  );
}

function CreerPage() {
  const [drafts, setDrafts] = useState(false);
  return (
    <AppShell title="Créer">
      <div className="space-y-6 px-4 py-5">
        <section className="space-y-4">
          <h1 className="text-lg font-semibold">Publier un contenu</h1>
          <div className="grid grid-cols-4 gap-1">
            <Link to="/creer/video" className={className}><Item icon={Video} titre="Importer vidéo" detail="" /></Link>
            <Link to="/creer/publication" search={{ type: "photos" }} className={className}><Item icon={Image} titre="Photos" detail="" /></Link>
            <Link to="/creer/publication" search={{ type: "texte" }} className={className}><Item icon={PenLine} titre="Texte" detail="" /></Link>
            <Link to="/creer/story" className={className}><Item icon={Clapperboard} titre="Story" detail="" /></Link>
          </div>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
            <Link to="/creer/video" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-primary px-3 text-center text-primary-foreground"><Plus className="size-7" /><span className="font-semibold">Nouveau Reel / vidéo</span></Link>
            <ActionButton variant="outline" className="h-auto min-h-28 flex-col gap-2 rounded-lg px-2" aria-expanded={drafts} onClick={() => setDrafts(!drafts)}><FolderOpen className="size-7" /><span>Brouillons</span></ActionButton>
          </div>
          {drafts ? <CreationDrafts /> : null}
          <div className="grid grid-cols-2 gap-3 border-y border-border py-4">
            <Link to="/creer/video" search={{ capture: "camera" }} className="flex items-center justify-center gap-2 py-2 text-sm font-semibold"><Camera className="size-5" /> Caméra</Link>
            <Link to="/creer/video" search={{ audio: true }} className="flex items-center justify-center gap-2 py-2 text-sm font-semibold"><Music className="size-5" /> Ajouter un son</Link>
          </div>
        </section>
        <section className="space-y-3 border-t border-border pt-5">
          <h2 className="text-lg font-semibold">Créer avec l’IA</h2>
          <Link to="/creer/video" search={{ mode: "ai" }} className="flex items-center gap-3 py-3"><Sparkles className="size-7 text-accent" /><span className="font-semibold">Studio IA</span><span className="ml-auto text-sm text-muted-foreground">Ouvrir →</span></Link>
        </section>
        <Link to="/modeles" className="flex items-center justify-between border-t border-border py-4 text-lg font-semibold">Modèles <Clapperboard className="size-5 text-accent" /></Link>
      </div>
    </AppShell>
  );
}

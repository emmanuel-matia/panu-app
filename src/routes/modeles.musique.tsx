import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clapperboard, Flame, Loader2, Mic2, Music, PenLine, Sparkles, Star } from "lucide-react";
import { useMemo } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { Equalizer, MusicTile } from "@/components/templates/TemplateTile";
import { useAuth } from "@/hooks/useAuth";
import { templateCover, templatesQuery } from "@/lib/templates";
import { newTemplates, popularTemplates } from "@/lib/templates-rules";

export const Route = createFileRoute("/modeles/musique")({
  head: () => ({
    meta: [
      { title: "Modèles Musique — PANU" },
      {
        name: "description",
        content:
          "Rap, afrobeat, gospel, rumba, musique festive : créez une chanson originale avec l'IA, vos paroles, une voix chantée et un clip vertical.",
      },
      { property: "og:title", content: "Modèles Musique — PANU" },
      { property: "og:description", content: "Créez des chansons et des clips musicaux avec l'IA sur PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MusicTemplatesPage,
});

const CAPABILITIES = [
  { icon: Sparkles, label: "Chanson originale" },
  { icon: PenLine, label: "Paroles par l'IA ou par vous" },
  { icon: Mic2, label: "Voix chantée ou instrumental" },
  { icon: Clapperboard, label: "Clip vertical sur le rythme" },
];

function MusicTemplatesPage() {
  const { user } = useAuth();
  const query = useQuery(templatesQuery(user?.id ?? null));
  const music = useMemo(() => (query.data ?? []).filter((t) => t.category === "musique"), [query.data]);
  const songs = useMemo(() => music.filter((t) => t.kind === "music"), [music]);
  const trending = popularTemplates(songs, 10);
  const fresh = newTemplates(songs, 8);
  const heroCover = templateCover("afro-beat", null);

  const back = (
    <Link to="/modeles" aria-label="Retour aux modèles" className="flex size-9 items-center justify-center rounded-full border border-border text-foreground">
      <ArrowLeft className="size-4" />
    </Link>
  );

  return (
    <AppShell title="Modèles Musique" subtitle="Chansons et clips avec l'IA" headerAction={back}>
      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : query.isError ? (
        <EmptyState icon={Music} title="Modèles indisponibles" description="La bibliothèque n'a pas pu être chargée. Réessayez dans un instant." />
      ) : (
        <div className="space-y-6 py-4">
          <div className="relative mx-4 overflow-hidden rounded-3xl bg-music p-5 text-primary-foreground shadow-glow">
            {heroCover ? (
              <img
                src={heroCover}
                alt=""
                width={768}
                height={960}
                className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
              />
            ) : null}
            <div className="relative max-w-[60%] space-y-2">
              <Equalizer className="h-6" bars={6} />
              <h1 className="font-display text-2xl leading-tight font-bold">Modèles Musique</h1>
              <p className="text-sm opacity-90">Créez des chansons et des clips avec l'IA, sur vos paroles et vos photos.</p>
              <a href="#tous" className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/60 px-3.5 py-1.5 text-xs font-semibold">
                Voir tous <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-surface-foreground">
                <c.icon className="size-4 shrink-0 text-accent" /> <span className="min-w-0">{c.label}</span>
              </div>
            ))}
          </div>

          <section className="space-y-2.5">
            <h2 className="flex items-center gap-2 px-4 text-base font-semibold text-foreground">
              <Flame className="size-4 text-destructive" /> Tendances Musique
            </h2>
            {trending.length ? (
              <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {trending.map((t) => (
                  <MusicTile key={t.id} template={t} />
                ))}
              </div>
            ) : (
              <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                Les tendances apparaîtront dès les premières chansons créées cette semaine.
              </p>
            )}
          </section>

          <section className="space-y-2.5">
            <h2 className="flex items-center gap-2 px-4 text-base font-semibold text-foreground">
              <Star className="size-4 text-gold" /> Nouveaux modèles
            </h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {fresh.map((t) => (
                <MusicTile key={t.id} template={t} badge="Nouveau" />
              ))}
            </div>
          </section>

          <section id="tous" className="scroll-mt-20 space-y-2.5">
            <h2 className="flex items-center gap-2 px-4 text-base font-semibold text-foreground">
              <Music className="size-4 text-accent" /> Tous les modèles musique ({music.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
              {music.map((t) => (
                <MusicTile key={t.id} template={t} className="w-full" />
              ))}
            </div>
            <p className="px-4 text-[0.6875rem] text-muted-foreground">
              Images d'illustration : chaque chanson et chaque clip que vous créez sont uniques.
            </p>
          </section>
        </div>
      )}
    </AppShell>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Camera, Clock, Coins, Cpu, Flame, Loader2, SearchX, Sparkles, Type } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateCover, TemplateTile } from "@/components/templates/TemplateTile";
import { useAuth } from "@/hooks/useAuth";
import { templatesQuery } from "@/lib/templates";
import { categoryLabel, costLabel, engineLabel, resultLabel, usesLabel } from "@/lib/templates-rules";

export const Route = createFileRoute("/modeles/$slug")({
  head: () => ({
    meta: [
      { title: "Modèle IA — PANU" },
      { name: "description", content: "Utilisez ce modèle PANU pour créer votre vidéo, photo ou musique avec l'IA." },
      { property: "og:title", content: "Modèle IA — PANU" },
      { property: "og:description", content: "Ajoutez votre photo ou votre texte : l'IA crée le reste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const query = useQuery(templatesQuery(user?.id ?? null));
  const template = query.data?.find((t) => t.slug === slug);

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: "/modeles" }))}
      aria-label="Retour"
      className="flex size-9 items-center justify-center rounded-full border border-border text-foreground"
    >
      <ArrowLeft className="size-4" />
    </button>
  );

  if (query.isPending) {
    return (
      <AppShell title="Modèle" headerAction={back}>
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }
  if (!template) {
    return (
      <AppShell title="Modèle" headerAction={back}>
        <EmptyState
          icon={SearchX}
          title="Modèle introuvable"
          description="Ce modèle n'existe pas ou a été désactivé."
          action={<Link to="/modeles" className="text-sm font-semibold text-electric">Voir tous les modèles</Link>}
        />
      </AppShell>
    );
  }

  const similar = (query.data ?? []).filter((t) => t.category === template.category && t.id !== template.id).slice(0, 8);
  const timing =
    template.kind === "video"
      ? `${template.settings.duration ?? 5} s · ${template.settings.aspect ?? "9:16"}`
      : template.kind === "music"
        ? `${template.settings.seconds ?? 30} s`
        : template.settings.format === "square"
          ? "Carré"
          : template.settings.format === "landscape"
            ? "Paysage"
            : "Portrait";

  return (
    <AppShell title={template.title} subtitle={categoryLabel(template.category)} headerAction={back}>
      <div className="space-y-5 pb-6">
        <div className="relative aspect-[4/5] max-h-[70vh] w-full overflow-hidden sm:mx-4 sm:w-auto sm:rounded-3xl">
          <TemplateCover template={template} eager className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <span className="absolute bottom-3 left-4 rounded-full bg-background/70 px-2.5 py-1 text-[0.625rem] text-muted-foreground backdrop-blur">
            Image d'illustration — votre création sera unique
          </span>
        </div>

        <div className="space-y-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 font-display text-2xl font-bold text-foreground">{template.title}</h1>
            <span className="flex shrink-0 items-center gap-1 pt-1 text-sm font-semibold text-foreground">
              <Flame className="size-4 text-destructive" /> {usesLabel(template.usesTotal)}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-surface-foreground">{template.description}</p>
          <div className="flex flex-wrap gap-2">
            {[resultLabel(template.kind), categoryLabel(template.category), template.subcategory].map((chip) => (
              <span key={chip} className="rounded-full border border-border px-3 py-1 text-xs text-surface-foreground">{chip}</span>
            ))}
          </div>
        </div>

        <div className="mx-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">Ce modèle nécessite :</p>
          <ul className="grid grid-cols-2 gap-3 text-xs text-surface-foreground">
            <li className="flex items-center gap-2">
              {template.inputKind === "photo" ? <Camera className="size-4 text-accent" /> : <Type className="size-4 text-accent" />}
              {template.inputKind === "photo" ? "1 photo + vos choix" : "Quelques mots"}
            </li>
            <li className="flex items-center gap-2"><Clock className="size-4 text-accent" /> {timing}</li>
            <li className="col-span-2 flex items-center gap-2"><Cpu className="size-4 text-accent" /> IA : {engineLabel(template.kind, template.inputKind)}</li>
            <li className="col-span-2 flex items-center gap-2"><Coins className="size-4 text-gold" /> {costLabel(template.creditCost)} — rendus si la création échoue</li>
          </ul>
          {template.fields.length ? (
            <div>
              <p className="text-xs font-semibold text-foreground">Paramètres à choisir</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{template.fields.map((f) => f.label).join(" · ")}</p>
            </div>
          ) : null}
        </div>

        <div className="px-4">
          <Link
            to="/creer/modele/$slug"
            params={{ slug: template.slug }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-primary-foreground shadow-glow"
          >
            <Sparkles className="size-5" /> Utiliser ce modèle
          </Link>
          {!user ? <p className="mt-2 text-center text-xs text-muted-foreground">Connexion requise pour créer.</p> : null}
        </div>

        {similar.length ? (
          <section className="space-y-2.5">
            <h2 className="px-4 text-base font-semibold text-foreground">Dans la même catégorie</h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {similar.map((t) => <TemplateTile key={t.id} template={t} size="sm" />)}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame, Loader2, Search, Sparkles, Star, Trophy, Wand2, Zap, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateCover, TemplateTile } from "@/components/templates/TemplateTile";
import { useAuth } from "@/hooks/useAuth";
import { templatesQuery } from "@/lib/templates";
import {
  isTemplateCategory,
  mostUsedTemplates,
  newTemplates,
  popularTemplates,
  recommendedTemplates,
  TEMPLATE_CATEGORIES,
  templateMatches,
  type TemplateCard,
} from "@/lib/templates-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/modeles/")({
  validateSearch: z.object({
    categorie: z.string().max(20).optional(),
    q: z.string().max(80).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Modèles IA — PANU" },
      {
        name: "description",
        content:
          "Modèles PANU réutilisables pour créer vidéos, photos, musiques, publicités et stories avec l'IA en quelques gestes.",
      },
      { property: "og:title", content: "Modèles IA — PANU" },
      { property: "og:description", content: "Choisissez un modèle, ajoutez votre photo ou votre texte, l'IA crée le reste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelesPage,
});

const STEPS = ["Choisissez un modèle", "Ajoutez votre photo ou texte", "L'IA crée", "Modifiez, téléchargez, publiez"];

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="px-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className="size-4 text-gold" /> {title}
        </h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ items, empty }: { items: TemplateCard[]; empty: string }) {
  if (items.length === 0) {
    return <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {items.map((t) => (
        <TemplateTile key={t.id} template={t} size="sm" />
      ))}
    </div>
  );
}

function ModelesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/modeles/" });
  const categorie = isTemplateCategory(search.categorie) ? search.categorie : undefined;
  const [text, setText] = useState(search.q ?? "");
  const query = useQuery(templatesQuery(user?.id ?? null));
  const all = useMemo(() => query.data ?? [], [query.data]);
  const q = text.trim();

  const filtered = useMemo(
    () => all.filter((t) => (!categorie || t.category === categorie) && templateMatches(t, q)),
    [all, categorie, q],
  );

  const chips = [{ id: undefined, label: "Tout" }, ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))];

  return (
    <AppShell title="Modèles" subtitle="Templates IA réutilisables">
      <div className="space-y-3 border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-2">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Rechercher un modèle"
            aria-label="Rechercher un modèle"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => void navigate({ search: (s) => ({ ...s, categorie: c.id }) })}
              aria-pressed={categorie === c.id}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold",
                categorie === c.id ? "bg-brand text-primary-foreground" : "border border-border bg-surface text-surface-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : query.isError ? (
        <EmptyState icon={Sparkles} title="Modèles indisponibles" description="La bibliothèque n'a pas pu être chargée. Réessayez dans un instant." />
      ) : categorie || q ? (
        filtered.length === 0 ? (
          <EmptyState icon={Search} title="Aucun modèle" description="Essayez un autre mot-clé ou une autre catégorie." />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3">
            {filtered.map((t) => (
              <TemplateTile key={t.id} template={t} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6 py-4">
          <div className="mx-4 overflow-hidden rounded-3xl bg-brand p-5 text-primary-foreground shadow-glow">
            <p className="font-display text-2xl font-bold">Créez avec l'IA</p>
            <p className="mt-1 max-w-xs text-sm opacity-90">
              Choisissez un modèle, ajoutez une photo ou quelques mots : l'IA réalise la vidéo, l'image ou la musique.
            </p>
            <ol className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2 rounded-xl bg-background/20 px-2.5 py-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background/40 font-bold">{i + 1}</span>
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <Section icon={Wand2} title="Catégories">
            <div className="grid grid-cols-2 gap-3 px-4">
              {TEMPLATE_CATEGORIES.map((c, i) => {
                const sample = all.find((t) => t.category === c.id);
                const count = all.filter((t) => t.category === c.id).length;
                return (
                  <Link
                    key={c.id}
                    to="/modeles"
                    search={{ categorie: c.id }}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border border-border",
                      i === TEMPLATE_CATEGORIES.length - 1 ? "col-span-2 aspect-[16/7]" : "aspect-[4/3]",
                    )}
                  >
                    {sample ? <TemplateCover template={sample} className="absolute inset-0 size-full" /> : <div className="absolute inset-0 bg-brand" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-semibold text-foreground">{c.label}</p>
                      <p className="truncate text-[0.6875rem] text-muted-foreground">
                        {c.detail} · {count} modèle{count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Section>

          <Section icon={Flame} title="Modèles populaires" hint="Les plus utilisés ces 7 derniers jours.">
            <Row items={popularTemplates(all)} empty="Aucune création cette semaine pour l'instant. Soyez le premier !" />
          </Section>
          <Section icon={Zap} title="Nouveaux modèles">
            <Row items={newTemplates(all)} empty="Aucun modèle publié pour le moment." />
          </Section>
          <Section icon={Trophy} title="Les plus utilisés" hint="Classement selon les créations réellement réalisées.">
            <Row items={mostUsedTemplates(all)} empty="Aucun modèle n'a encore été utilisé." />
          </Section>
          {user ? (
            <Section icon={Star} title="Recommandés pour vous" hint="D'après les catégories que vous avez déjà utilisées.">
              <Row items={recommendedTemplates(all)} empty="Utilisez un premier modèle pour recevoir des recommandations." />
            </Section>
          ) : null}

          {TEMPLATE_CATEGORIES.map((c) => {
            const items = all.filter((t) => t.category === c.id);
            if (items.length === 0) return null;
            return (
              <section key={c.id} className="space-y-2.5">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-base font-semibold text-foreground">Templates {c.label}</h2>
                  <Link to="/modeles" search={{ categorie: c.id }} className="flex items-center gap-1 text-xs font-semibold text-electric">
                    Voir tout <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                <Row items={items} empty="" />
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

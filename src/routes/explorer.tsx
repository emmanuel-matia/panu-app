import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/layout/AppShell";
import { VideoPostList } from "@/components/video/VideoPostList";
import { isPostCategory, matchesSearch, POST_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const SCOPES = [
  { id: "tout", label: "Tout" },
  { id: "utilisateurs", label: "Utilisateurs" },
  { id: "videos", label: "Vidéos" },
  { id: "hashtags", label: "Hashtags" },
] as const;

export const Route = createFileRoute("/explorer")({
  validateSearch: z.object({
    q: z.string().max(80).optional(),
    categorie: z.string().max(30).optional(),
    filtre: z.enum(["tout", "utilisateurs", "videos", "hashtags"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Explorer — PANU" },
      {
        name: "description",
        content: "Recherchez des créateurs, des vidéos et des sujets sur PANU par mot-clé ou par catégorie.",
      },
      { property: "og:title", content: "Explorer — PANU" },
      { property: "og:description", content: "Recherchez des créateurs, des vidéos et des sujets sur PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explorer" });
  const [text, setText] = useState(search.q ?? "");
  const scope = search.filtre ?? "tout";
  const categorie = isPostCategory(search.categorie) ? search.categorie : undefined;
  const q = search.q ?? "";

  useEffect(() => setText(search.q ?? ""), [search.q]);

  // La recherche suit la saisie (mise à jour de l'adresse après une courte pause).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text.trim() !== q) void navigate({ search: (s) => ({ ...s, q: text.trim() || undefined }), replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [text, q, navigate]);

  const active = Boolean(q || categorie);

  return (
    <AppShell title="Explorer" subtitle="Recherche">
      <div className="space-y-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-2">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Rechercher sur PANU"
            aria-label="Rechercher sur PANU"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void navigate({ search: (prev) => ({ ...prev, filtre: s.id === "tout" ? undefined : s.id }) })}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs",
                scope === s.id
                  ? "bg-brand font-semibold text-primary-foreground"
                  : "border border-border font-medium text-muted-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {POST_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                void navigate({ search: (prev) => ({ ...prev, categorie: categorie === c ? undefined : c }) })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                categorie === c
                  ? "border-electric bg-electric/15 text-foreground"
                  : "border-border bg-surface text-surface-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <VideoPostList
          filterKey={`${q}|${categorie ?? ""}|${scope}`}
          filter={(p) => (!categorie || p.category === categorie) && matchesSearch(p, q, scope)}
          emptyTitle="Aucun résultat"
          emptyDescription={
            categorie && !q
              ? `Aucune publication récente dans la catégorie ${categorie}.`
              : "Essayez un autre mot-clé ou une autre catégorie."
          }
        />
      ) : (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          Recherchez un créateur, un titre ou un #hashtag, ou choisissez une catégorie.
        </p>
      )}
    </AppShell>
  );
}

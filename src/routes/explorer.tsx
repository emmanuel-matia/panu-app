import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Explorer — PANU" },
      {
        name: "description",
        content:
          "Recherchez des créateurs, des vidéos et des sujets sur PANU par mot-clé ou par catégorie.",
      },
      { property: "og:title", content: "Explorer — PANU" },
      {
        property: "og:description",
        content: "Recherchez des créateurs, des vidéos et des sujets sur PANU.",
      },
    ],
  }),
  component: ExplorerPage,
});

const filtres = ["Tout", "Utilisateurs", "Vidéos", "Hashtags"] as const;
const categories = [
  "Musique",
  "Business",
  "Technologie",
  "Sport",
  "Éducation",
  "Lifestyle",
] as const;

function ExplorerPage() {
  return (
    <AppShell title="Explorer" subtitle="Recherche">
      <div className="space-y-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-2">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            placeholder="Rechercher sur PANU"
            aria-label="Rechercher sur PANU"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filtres.map((filtre, index) => (
            <span
              key={filtre}
              className={
                index === 0
                  ? "rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {filtre}
            </span>
          ))}
        </div>
      </div>

      <EmptyState
        icon={Search}
        title="Aucun résultat"
        description="Essayez un autre mot-clé ou parcourez les catégories ci-dessous."
      />

      <section className="px-4 pb-8">
        <h2 className="text-sm font-semibold text-foreground">Catégories populaires</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((categorie) => (
            <span
              key={categorie}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-surface-foreground"
            >
              {categorie}
            </span>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

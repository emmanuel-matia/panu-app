import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import {
  isTemplateCategory,
  parseFields,
  parseSettings,
  type TemplateCard,
  type TemplateInput,
  type TemplateKind,
} from "./templates-rules";

// Images d'illustration des modèles fournis avec PANU (une par identifiant de modèle).
const BUNDLED_COVERS = import.meta.glob("../assets/templates/*.jpg", { eager: true, import: "default" }) as Record<
  string,
  string
>;

/** Image d'illustration d'un modèle : lien https défini par l'équipe, sinon image fournie, sinon aucune. */
export function templateCover(slug: string, coverUrl: string | null): string | null {
  if (coverUrl) return coverUrl;
  return BUNDLED_COVERS[`../assets/templates/${slug}.jpg`] ?? null;
}

type Row = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  kind: string;
  input_kind: string;
  fields: unknown;
  settings: unknown;
  credit_cost: number;
  cover_url: string | null;
  created_at: string;
  uses_total: number | string;
  uses_7d: number | string;
  used_by_me: boolean;
};

export function mapTemplate(r: Row): TemplateCard | null {
  if (!isTemplateCategory(r.category)) return null;
  if (r.kind !== "image" && r.kind !== "video" && r.kind !== "music") return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory,
    kind: r.kind as TemplateKind,
    inputKind: (r.input_kind === "photo" ? "photo" : "none") as TemplateInput,
    fields: parseFields(r.fields),
    settings: parseSettings(r.settings),
    creditCost: r.credit_cost,
    coverUrl: r.cover_url,
    createdAt: r.created_at,
    usesTotal: Number(r.uses_total),
    uses7d: Number(r.uses_7d),
    usedByMe: Boolean(r.used_by_me),
  };
}

export const templatesQuery = (userId: string | null) =>
  queryOptions({
    queryKey: ["templates", userId ?? "anon"],
    staleTime: 30_000,
    queryFn: async (): Promise<TemplateCard[]> => {
      const { data, error } = await supabase.rpc("list_templates");
      if (error) throw error;
      return (data ?? []).map((r) => mapTemplate(r as Row)).filter((t): t is TemplateCard => t !== null);
    },
  });

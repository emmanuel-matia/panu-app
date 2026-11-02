import { describe, expect, it } from "vitest";

import {
  buildPrompt,
  costLabel,
  mostUsedTemplates,
  newTemplates,
  parseFields,
  popularTemplates,
  recommendedTemplates,
  validateTemplateDraft,
  validateTemplateInputs,
  type TemplateCard,
} from "./templates-rules";

function card(over: Partial<TemplateCard> & { id: string }): TemplateCard {
  return {
    slug: over.id,
    title: over.id,
    description: "d",
    category: "video",
    subcategory: "s",
    kind: "video",
    inputKind: "none",
    fields: [],
    settings: {},
    creditCost: 10,
    coverUrl: null,
    createdAt: "2026-11-01T00:00:00Z",
    usesTotal: 0,
    uses7d: 0,
    usedByMe: false,
    ...over,
  };
}

const fields = parseFields([
  { id: "scene", label: "Scène", type: "textarea", required: true },
  { id: "mood", label: "Ambiance", type: "select", required: true, options: ["épique", "calme"] },
  { id: "extra", label: "Détail", type: "text", required: false },
]);

describe("formulaire d'un modèle", () => {
  it("construit l'instruction avec les réponses", () => {
    expect(buildPrompt("Plan: {{scene}}, {{mood}}.", { scene: "un lion", mood: "épique" })).toBe("Plan: un lion, épique.");
  });

  it("refuse un champ obligatoire vide", () => {
    const r = validateTemplateInputs(fields, { scene: "  ", mood: "épique" });
    expect(r).toEqual({ ok: false, error: "Renseignez « Scène »." });
  });

  it("refuse un choix qui n'est pas dans la liste", () => {
    const r = validateTemplateInputs(fields, { scene: "x", mood: "pirate" });
    expect(r.ok).toBe(false);
  });

  it("accepte un champ facultatif vide et retire les accolades injectées", () => {
    const r = validateTemplateInputs(fields, { scene: "un {{mood}} lion", mood: "calme" });
    expect(r).toEqual({ ok: true, values: { scene: "un mood lion", mood: "calme", extra: "" } });
  });

  it("refuse un texte trop long (300 caractères pour un champ simple)", () => {
    const r = validateTemplateInputs(fields, { scene: "x", mood: "calme", extra: "a".repeat(301) });
    expect(r.ok).toBe(false);
  });
});

describe("classements calculés sur les utilisations réelles", () => {
  const list = [
    card({ id: "a", usesTotal: 5, uses7d: 0, createdAt: "2026-10-01T00:00:00Z" }),
    card({ id: "b", usesTotal: 3, uses7d: 3, createdAt: "2026-10-02T00:00:00Z" }),
    card({ id: "c", usesTotal: 0, uses7d: 0, createdAt: "2026-10-03T00:00:00Z" }),
  ];

  it("populaires = utilisés cette semaine uniquement", () => {
    expect(popularTemplates(list).map((t) => t.id)).toEqual(["b"]);
  });

  it("les plus utilisés excluent les modèles jamais utilisés", () => {
    expect(mostUsedTemplates(list).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("aucun classement n'est fabriqué quand rien n'a été utilisé", () => {
    const none = [card({ id: "x" }), card({ id: "y" })];
    expect(popularTemplates(none)).toEqual([]);
    expect(mostUsedTemplates(none)).toEqual([]);
  });

  it("nouveaux = les plus récents d'abord", () => {
    expect(newTemplates(list).map((t) => t.id)).toEqual(["c", "b", "a"]);
  });

  it("recommandés = non utilisés dans les catégories déjà utilisées, rien sans historique", () => {
    const mixed = [
      card({ id: "v1", category: "video", usedByMe: true }),
      card({ id: "v2", category: "video", usesTotal: 2 }),
      card({ id: "p1", category: "photo", usesTotal: 9 }),
    ];
    expect(recommendedTemplates(mixed).map((t) => t.id)).toEqual(["v2"]);
    expect(recommendedTemplates([card({ id: "p1", category: "photo" })])).toEqual([]);
  });
});

describe("modèle saisi par l'équipe", () => {
  const ok = {
    slug: "mon-modele",
    title: "Mon modèle",
    description: "Une description valable",
    subcategory: "Test",
    promptTemplate: "Une scène de {{scene}} très détaillée",
    fields: parseFields([{ id: "scene", label: "Scène", type: "text", required: true }]),
    creditCost: 10,
    kind: "video" as const,
    inputKind: "none" as const,
    coverUrl: "",
  };

  it("accepte un modèle complet", () => {
    expect(validateTemplateDraft(ok)).toBeNull();
  });

  it("refuse un coût de 101 crédits", () => {
    expect(validateTemplateDraft({ ...ok, creditCost: 101 })).not.toBeNull();
  });

  it("refuse une instruction qui utilise un champ inexistant", () => {
    expect(validateTemplateDraft({ ...ok, promptTemplate: "Une scène de {{inconnu}} détaillée" })).toContain("inconnu");
  });

  it("refuse une musique avec photo", () => {
    expect(validateTemplateDraft({ ...ok, kind: "music", inputKind: "photo" })).not.toBeNull();
  });

  it("un modèle à 0 crédit est affiché gratuit", () => {
    expect(costLabel(0)).toBe("Gratuit");
    expect(costLabel(10)).toBe("10 crédits");
  });
});

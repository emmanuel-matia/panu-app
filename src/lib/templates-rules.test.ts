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

import { buildSongPrompt, cleanLyrics, lyricsLineCount, musicOptions, parseSettings, resolveVocals } from "./templates-rules";

describe("modèles musique", () => {
  it("la règle du modèle impose la voix, quel que soit le choix envoyé", () => {
    expect(resolveVocals("instrumental", "sung")).toBe("instrumental");
    expect(resolveVocals("sung", "instrumental")).toBe("sung");
    expect(resolveVocals("choice", "instrumental")).toBe("instrumental");
    expect(resolveVocals("choice", undefined)).toBe("sung");
  });
  it("un modèle instrumental n'a pas d'étape paroles ; clip proposé par défaut", () => {
    expect(musicOptions({ vocals: "instrumental", lyrics: true })).toEqual({ vocals: "instrumental", lyrics: false, clip: true });
    expect(musicOptions({})).toEqual({ vocals: "choice", lyrics: true, clip: true });
    expect(musicOptions({ clip: false }).clip).toBe(false);
  });
  it("lit les réglages musique et refuse un extrait non https", () => {
    expect(parseSettings({ vocals: "sung", lyrics: false, clip: true, demo: "http://x.fr/a.mp3" })).toEqual({ vocals: "sung", lyrics: false, clip: true });
    expect(parseSettings({ demo: "https://cdn.panu.app/demo.mp3" }).demo).toBe("https://cdn.panu.app/demo.mp3");
    expect(parseSettings({ vocals: "rap" }).vocals).toBeUndefined();
  });
  it("l'instruction chantée contient la langue et les paroles exactes", () => {
    const p = buildSongPrompt({ base: "A joyful afrobeats song.", vocals: "sung", language: "fr", lyrics: "[Refrain]\nKinshasa danse" });
    expect(p).toContain("singing in French");
    expect(p).toContain("[Refrain]\nKinshasa danse");
    expect(buildSongPrompt({ base: "A song.", vocals: "instrumental", language: "fr", lyrics: "la la" })).toBe("A song. Instrumental only, no vocals.");
  });
  it("nettoie les paroles et limite leur longueur à 1500 caractères", () => {
    expect(cleanLyrics("  a\u0007b  \n\n\n\nc {{x}} ")).toBe("a b\n\nc x");
    expect(cleanLyrics("x".repeat(2000))).toHaveLength(1500);
    expect([lyricsLineCount(15), lyricsLineCount(30), lyricsLineCount(60)]).toEqual([4, 8, 16]);
  });
});

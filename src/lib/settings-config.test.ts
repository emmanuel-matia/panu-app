import { describe, expect, it } from "vitest";

import { findSection, SETTINGS_SECTIONS, searchSections } from "./settings-config";

describe("recherche dans les paramètres", () => {
  it("trouve une rubrique sans tenir compte des accents ni des majuscules", () => {
    expect(searchSections("Confidentialite").map((s) => s.id)).toContain("assistance-confidentialite");
    expect(searchSections("bloquer").map((s) => s.id)).toEqual(["blocage"]);
  });
  it("exige tous les mots et renvoie tout pour une saisie vide", () => {
    expect(searchSections("zzzz")).toEqual([]);
    expect(searchSections("")).toHaveLength(SETTINGS_SECTIONS.length);
  });
  it("a des identifiants uniques", () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findSection("mode-sombre")?.title).toBe("Mode sombre");
  });
});

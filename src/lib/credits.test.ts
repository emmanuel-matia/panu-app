import { describe, expect, it } from "vitest";

import { AI_CREDIT_COSTS, canAfford, WELCOME_CREDITS } from "./credits";

describe("crédits PANU", () => {
  it("offre 60 crédits de bienvenue", () => {
    expect(WELCOME_CREDITS).toBe(60);
  });

  it("refuse une image quand le solde est inférieur à son coût", () => {
    expect(canAfford(AI_CREDIT_COSTS.image - 1, "image")).toBe(false);
  });

  it("accepte une image quand le solde couvre exactement son coût", () => {
    expect(canAfford(AI_CREDIT_COSTS.image, "image")).toBe(true);
  });

  it("refuse toute génération sans solde connu", () => {
    expect(canAfford(null, "text")).toBe(false);
  });

  it("les 60 crédits offerts permettent au moins une vidéo", () => {
    expect(canAfford(WELCOME_CREDITS, "video")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  cleanReferralCode,
  DEFAULT_PREFS,
  normalizeContactNumbers,
  normalizeWebsite,
  parsePrefs,
  periodRange,
  referralLink,
  resolveTheme,
  sanitizeTabExtras,
  shouldAutoplay,
} from "./prefs";

describe("préférences", () => {
  it("garde les valeurs par défaut quand rien n'est enregistré", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({ theme: 42 }).theme).toBe("dark");
    expect(parsePrefs({ theme: "light" }).theme).toBe("light");
  });

  it("limite la barre d'onglets à 2 raccourcis connus", () => {
    expect(sanitizeTabExtras(["messages", "messages", "inconnu", "marketplace", "formations"])).toEqual([
      "messages",
      "marketplace",
    ]);
  });

  it("applique le mode automatique selon l'appareil", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("ne lance pas la vidéo en Wi-Fi uniquement sans Wi-Fi confirmé", () => {
    expect(shouldAutoplay("wifi", { type: "cellular" }, false)).toBe(false);
    expect(shouldAutoplay("wifi", undefined, false)).toBe(false);
    expect(shouldAutoplay("wifi", { type: "wifi" }, false)).toBe(true);
    expect(shouldAutoplay("always", undefined, true)).toBe(false);
    expect(shouldAutoplay("never", { type: "wifi" }, false)).toBe(false);
  });
});

describe("tableau de bord", () => {
  const now = new Date(2026, 10, 2, 15, 0, 0);
  it("calcule 7 jours en incluant aujourd'hui", () => {
    const r = periodRange("7d", now)!;
    expect(r.from.getDate()).toBe(27);
    expect(r.to).toBe(now);
  });
  it("refuse une période personnalisée inversée ou de plus d'un an", () => {
    expect(periodRange("custom", now, { from: "2026-11-02", to: "2026-11-01" })).toBeNull();
    expect(periodRange("custom", now, { from: "2024-01-01", to: "2026-01-01" })).toBeNull();
    expect(periodRange("custom", now, { from: "2026-10-01", to: "2026-10-31" })).not.toBeNull();
  });
});

describe("amis et parrainage", () => {
  it("nettoie les numéros du répertoire", () => {
    expect(normalizeContactNumbers(["+243 81 234 5678", "0812345678", "0812345678", "123"])).toEqual([
      "243812345678",
      "0812345678",
    ]);
  });
  it("valide les codes de parrainage", () => {
    expect(cleanReferralCode(" ab12cd34 ")).toBe("AB12CD34");
    expect(cleanReferralCode("abc")).toBeNull();
    expect(cleanReferralCode("AB-12CD34")).toBeNull();
  });
  it("construit le lien d'invitation", () => {
    expect(referralLink("https://panu-app.lovable.app/", "AB12CD34")).toBe(
      "https://panu-app.lovable.app/inscription?ref=AB12CD34",
    );
  });
  it("normalise le site web", () => {
    expect(normalizeWebsite("panu.africa")).toBe("https://panu.africa/");
    expect(normalizeWebsite("pas un site")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});

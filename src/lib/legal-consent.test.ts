import { describe, expect, it } from "vitest";

import { CONSENT_DOCUMENTS, CONSENT_VERSION, makePendingConsent, needsConsent, parsePendingConsent } from "./legal-consent";

describe("consentement aux documents juridiques", () => {
  it("accepte ensemble les CGU et la politique de confidentialité", () => {
    expect([...CONSENT_DOCUMENTS]).toEqual(["cgu", "confidentialite"]);
  });

  it("enregistre la version 1.0 des documents", () => {
    expect(CONSENT_VERSION).toBe("1.0 – Projet de documents juridiques");
  });

  it("garde la date à laquelle la case a été cochée", () => {
    const at = new Date("2026-11-02T18:00:00Z");
    expect(makePendingConsent("inscription", at)).toEqual({
      version: CONSENT_VERSION,
      source: "inscription",
      checkedAt: "2026-11-02T18:00:00.000Z",
    });
  });

  it("refuse un consentement en attente mal formé", () => {
    expect(parsePendingConsent('{"version":"1.0","source":"pirate","checkedAt":"2026-11-02"}')).toBeNull();
    expect(parsePendingConsent("pas du json")).toBeNull();
    expect(parsePendingConsent(null)).toBeNull();
  });

  it("demande d'accepter tant que la version courante n'a pas été acceptée", () => {
    expect(needsConsent([])).toBe(true);
    expect(needsConsent(["0.9"])).toBe(true);
    expect(needsConsent([CONSENT_VERSION])).toBe(false);
  });
});

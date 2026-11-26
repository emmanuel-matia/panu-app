import { describe, expect, it } from "vitest";
import { assertMatchingProof, canUseChannel, packConfigSchema, providerProofSchema, toMinorUnits } from "./coins-rules";
import launch from "../features/wallet/launch-catalogue.json";

describe("PANU Coins — règles financières", () => {
  it("convertit exactement les prix sans arrondi flottant", () => { expect(toMinorUnits("1.09", 2)).toBe("109"); });
  it("prend en charge des devises sans décimales", () => { expect(toMinorUnits("3500", 0)).toBe("3500"); });
  it("refuse un prix nul", () => { expect(() => toMinorUnits("0", 2)).toThrow(); });
  it("refuse les fractions incompatibles avec la devise", () => { expect(() => toMinorUnits("1.001", 2)).toThrow(); });
  it("refuse les quantités négatives", () => { expect(packConfigSchema.safeParse({ name: "Pack", coins: -70, bonus: 0, popular: false, active: false }).success).toBe(false); });
  const channel = { enabled: true, verified: true, country: "CD", currency: "USD", provider: "merchant", channel: "mobile_money" };
  it("ne présente jamais un moyen non vérifié comme disponible", () => { expect(canUseChannel({ ...channel, verified: false }, "CD", "USD", ["merchant"], false)).toBe(false); });
  it("refuse un prestataire sans intégration serveur", () => { expect(canUseChannel(channel, "CD", "USD", [], false)).toBe(false); });
  it("respecte la disponibilité par pays", () => { expect(canUseChannel(channel, "FR", "USD", ["merchant"], false)).toBe(false); });
  it("respecte la disponibilité par devise", () => { expect(canUseChannel(channel, "CD", "CDF", ["merchant"], false)).toBe(false); });
  it("n'expose pas un achat externe dans le parcours Google Play", () => { expect(canUseChannel(channel, "CD", "USD", ["merchant"], true)).toBe(false); });
  const order = { id: "f379e0d1-8a31-4bf9-851e-5a1d4b8b1f39", provider: "merchant", amount_minor: "109", currency: "USD" };
  const proof = providerProofSchema.parse({ orderId: order.id, provider: "merchant", amountMinor: "109", currency: "USD", externalReference: "payment-1", eventId: "event-1", state: "succeeded" });
  it("refuse un montant falsifié", () => { expect(() => assertMatchingProof(order, { ...proof, amountMinor: "1" })).toThrow(); });
  it("refuse la preuve d'un autre achat", () => { expect(() => assertMatchingProof(order, { ...proof, orderId: "a379e0d1-8a31-4bf9-851e-5a1d4b8b1f39" })).toThrow(); });
  it("refuse une preuve dans une autre devise", () => { expect(() => assertMatchingProof(order, { ...proof, currency: "CDF" })).toThrow(); });
  it("refuse la preuve d'un autre prestataire", () => { expect(() => assertMatchingProof(order, { ...proof, provider: "other" })).toThrow(); });
});

describe("Catalogue de lancement approuvé", () => {
  const approved = [[70, "0.99", "99"], [100, "1.00", "100"], [220, "2.00", "200"], [350, "3.00", "300"], [600, "5.00", "500"], [750, "6.00", "600"], [1400, "10.99", "1099"], [3000, "21.49", "2149"], [7500, "53.99", "5399"], [16000, "109.99", "10999"]] as const;
  it.each(approved)("%i Coins coûtent %s USD", (coins, amount, minor) => {
    const pack = launch.packs.find((p) => p.coins === coins);
    expect(pack?.amount).toBe(amount);
    expect(toMinorUnits(pack?.amount ?? "0", launch.exponent)).toBe(minor);
  });
  it("utilise USD comme devise de référence", () => { expect(launch.currency).toBe("USD"); });
  it("contient exactement les dix packs approuvés", () => { expect(launch.packs).toHaveLength(10); });
  it("n’ajoute aucun bonus non défini", () => { expect(launch.packs.every((p) => p.bonus === 0)).toBe(true); });
});
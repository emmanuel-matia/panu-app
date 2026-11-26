import { z } from "zod";

export const countrySchema = z.string().regex(/^[A-Z]{2}$/, "Code pays à deux lettres requis");
export const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Code devise à trois lettres requis");
const integer = (max: number, min = 0) => z.coerce.number().int().min(min).max(max);
export const packConfigSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80),
  coins: integer(1_000_000_000, 1), bonus: integer(1_000_000_000), popular: z.boolean(), active: z.boolean(),
});
export const priceConfigSchema = z.object({
  id: z.string().uuid().optional(), pack_id: z.string().uuid(), country: countrySchema, currency: currencySchema,
  amount: z.string().regex(/^\d{1,13}(\.\d{1,3})?$/, "Montant invalide"), exponent: integer(3),
  google_product_id: z.string().trim().max(100), active: z.boolean(),
}).superRefine((value, ctx) => {
  try { toMinorUnits(value.amount, value.exponent); } catch (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: error instanceof Error ? error.message : "Montant invalide" });
  }
});
export const channelConfigSchema = z.object({
  id: z.string().uuid().optional(), provider: z.string().regex(/^[a-z0-9_]{2,40}$/), name: z.string().trim().min(1).max(80),
  channel: z.enum(["mobile_money", "google_play", "card", "bank_transfer"]),
  country: countrySchema, currency: currencySchema, enabled: z.boolean(),
});
export const configSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pack"), data: packConfigSchema }),
  z.object({ kind: z.literal("price"), data: z.object({
    id: z.string().uuid().optional(), pack_id: z.string().uuid(), country: countrySchema, currency: currencySchema,
    amount: z.string(), exponent: integer(3), google_product_id: z.string().max(100), active: z.boolean(),
  }) }),
  z.object({ kind: z.literal("channel"), data: channelConfigSchema }),
]);

/** Exact arithmetic: no float conversion in accounting or provider comparisons. */
export function toMinorUnits(amount: string, exponent: number): string {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 3 || !/^\d{1,13}(\.\d{1,3})?$/.test(amount)) throw new Error("Montant invalide");
  const [whole = "", fraction = ""] = amount.split(".");
  if (fraction.length > exponent) throw new Error("Trop de décimales pour cette devise");
  const units = BigInt(whole) * 10n ** BigInt(exponent) + BigInt(fraction.padEnd(exponent, "0") || "0");
  if (units <= 0n || units > 1_000_000_000_000n) throw new Error("Le prix doit être positif et dans la limite autorisée");
  return units.toString();
}
export function decimalAmount(units: string, exponent: number): string {
  const value = BigInt(units).toString().padStart(exponent + 1, "0");
  return exponent ? `${value.slice(0, -exponent)}.${value.slice(-exponent)}` : value;
}
export function formatCoinPrice(units: string, exponent: number, currency: string): string {
  const [whole = "0", fraction] = decimalAmount(units, exponent).split(".");
  return `${BigInt(whole).toLocaleString("fr-FR")}${fraction ? `,${fraction}` : ""} ${currency}`;
}
export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", processing: "En cours", succeeded: "Confirmé", failed: "Échoué", cancelled: "Annulé", refunded: "Remboursé",
};
export const PAYMENT_CANDIDATES = [
  { name: "M-Pesa · Vodacom RDC", channel: "mobile_money" },
  { name: "Orange Money · Orange RDC", channel: "mobile_money" },
  { name: "Airtel Money · Airtel RDC", channel: "mobile_money" },
  { name: "Afrimoney · Africell", channel: "mobile_money" },
  { name: "Google Play", channel: "google_play" },
  { name: "Visa et cartes compatibles", channel: "card" },
  { name: "Virement bancaire", channel: "bank_transfer" },
] as const;

export const providerProofSchema = z.object({
  orderId: z.string().uuid(), provider: z.string().regex(/^[a-z0-9_]{2,40}$/),
  externalReference: z.string().trim().min(1).max(160), eventId: z.string().trim().min(1).max(160),
  amountMinor: z.string().regex(/^[1-9]\d{0,12}$/), currency: currencySchema,
  state: z.enum(["pending", "processing", "succeeded", "failed", "cancelled"]),
});
export function assertMatchingProof(order: { id: string; provider: string; amount_minor: string; currency: string }, proof: z.infer<typeof providerProofSchema>) {
  if (order.id !== proof.orderId || order.provider !== proof.provider || BigInt(order.amount_minor) !== BigInt(proof.amountMinor) || order.currency !== proof.currency) {
    throw new Error("Le paiement ne correspond pas à cet achat");
  }
}
export function canUseChannel(channel: { enabled: boolean; verified: boolean; country: string; currency: string; provider: string; channel: string }, country: string, currency: string, adapters: string[], playStore: boolean) {
  return channel.enabled && channel.verified && channel.country === country && channel.currency === currency && adapters.includes(channel.provider) && (!playStore || channel.channel === "google_play");
}
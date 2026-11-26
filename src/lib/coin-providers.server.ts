import type { CoinOrder } from "./coins-data";
import { providerProofSchema } from "./coins-rules";
import type { z } from "zod";
import type { providerNetProofSchema } from './gifts-data';

/** Provider implementations must verify payments independently; no browser proof is accepted. */
export interface CoinPaymentAdapter {
  createCheckout(order: CoinOrder): Promise<{ url: string; state: "pending" | "processing" }>;
  verifyPayment(order: CoinOrder): Promise<z.infer<typeof providerProofSchema>>;
  verifyWebhook(request: Request): Promise<{ orderId: string }>;
  /** Independent provider settlement read, never inferred from a configured percentage or browser input. */
  verifyNetSettlement?(order: CoinOrder): Promise<z.infer<typeof providerNetProofSchema> | null>;
}
// Deliberately empty until a contracted merchant provider or Google Play purchase service is linked and validated.
// Adding a database channel or enabling it in the admin UI cannot bypass this registry.
const adapters = new Map<string, CoinPaymentAdapter>();
export function configuredCoinProviders(): string[] { return [...adapters.keys()]; }
export function requireCoinProvider(provider: string): CoinPaymentAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) throw new Error("Ce prestataire de paiement n’est pas encore connecté et validé");
  return adapter;
}
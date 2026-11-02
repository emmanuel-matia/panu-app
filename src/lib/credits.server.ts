import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import { AI_CREDIT_COSTS, creditsLabel, type AiCreditKind } from "./credits";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

/** Débite les crédits avant une génération ; renvoie la fonction de remboursement en cas d'échec. */
export async function chargeCredits(ctx: Ctx, kind: AiCreditKind): Promise<() => Promise<void>> {
  const amount = AI_CREDIT_COSTS[kind];
  // Crée le solde (crédits de bienvenue) si le compte n'en a pas encore.
  await ctx.supabase.rpc("claim_welcome_credits");
  const { error } = await ctx.supabase.rpc("spend_credits", { _amount: amount, _reason: `ia-${kind}` });
  if (error) {
    if (/insuffisants/i.test(error.message)) {
      throw new Error(`Crédits insuffisants : cette création coûte ${creditsLabel(amount)}.`);
    }
    console.error(error);
    throw new Error("Vérification de vos crédits impossible. Réessayez.");
  }
  return () => refundCredits(ctx.userId, kind);
}

export async function refundCredits(userId: string, kind: AiCreditKind) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("refund_credits", {
      _user_id: userId,
      _amount: AI_CREDIT_COSTS[kind],
      _reason: `remboursement-${kind}`,
    });
    if (error) console.error(error);
  } catch (e) {
    console.error(e);
  }
}

/** Exécute une génération payante : crédits débités, puis rendus si la génération échoue. */
export async function withCredits<T>(ctx: Ctx, kind: AiCreditKind, run: () => Promise<T>): Promise<T> {
  const refund = await chargeCredits(ctx, kind);
  try {
    return await run();
  } catch (e) {
    await refund();
    throw e;
  }
}

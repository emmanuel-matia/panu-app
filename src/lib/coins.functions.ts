import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminCoinsSchema, catalogueSchema, coinOrderSchema, walletSchema } from "./coins-data";
import { assertMatchingProof, channelConfigSchema, configSchema, packConfigSchema, priceConfigSchema, providerProofSchema, toMinorUnits } from "./coins-rules";

export const getCoins = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [wallet, catalogue] = await Promise.all([context.supabase.rpc("coin_get_wallet"), context.supabase.rpc("coin_catalogue")]);
  if (wallet.error) throw new Error(wallet.error.message);
  if (catalogue.error) throw new Error(catalogue.error.message);
  const { configuredCoinProviders } = await import("./coin-providers.server");
  return { wallet: walletSchema.parse(wallet.data), catalogue: catalogueSchema.parse(catalogue.data), adapters: configuredCoinProviders() };
});
export const getAdminCoins = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("coin_admin_data");
  if (error) throw new Error(error.message);
  return adminCoinsSchema.parse(data);
});
export const saveCoinsConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input)).handler(async ({ context, data }) => {
    const payload = data.kind === "price" ? (() => {
      const p = priceConfigSchema.parse(data.data);
      return { ...p, amount_minor: toMinorUnits(p.amount, p.exponent) };
    })() : data.kind === "pack" ? packConfigSchema.parse(data.data) : channelConfigSchema.parse(data.data);
    const { data: id, error } = await context.supabase.rpc("coin_admin_save", { _kind: data.kind, _data: payload });
    if (error) throw new Error(error.message);
    return { id };
  });
export const setDefaultCoinMethod = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("coin_set_default_method", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const startCoinPurchase = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ priceId: z.string().uuid(), channelId: z.string().uuid(), requestId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: raw, error } = await context.supabase.rpc("coin_catalogue");
    if (error) throw new Error(error.message);
    const catalogue = catalogueSchema.parse(raw);
    const channel = catalogue.channels.find((c) => c.id === data.channelId && c.enabled && c.verified);
    if (!channel) throw new Error("Moyen de paiement non disponible");
    const { requireCoinProvider } = await import("./coin-providers.server");
    const adapter = requireCoinProvider(channel.provider); // Fail before creating a financial order when not integrated.
    const { data: orderRaw, error: orderError } = await context.supabase.rpc("coin_create_order", { _price: data.priceId, _channel: data.channelId, _request: data.requestId });
    if (orderError) throw new Error(orderError.message);
    const order = coinOrderSchema.parse(orderRaw);
    if (order.status !== "pending" && order.status !== "processing") return { orderId: order.id, url: null, state: order.status };
    const checkout = await adapter.createCheckout(order); // Provider must use order.id as its idempotency key.
    const url = z.string().url().parse(checkout.url);
    if (new URL(url).protocol !== "https:") throw new Error("Adresse de paiement non sécurisée");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: stateError } = await supabaseAdmin.rpc("coin_provider_state", { _order: order.id, _provider: order.provider, _state: checkout.state, _url: url });
    if (stateError) throw new Error(stateError.message);
    return { orderId: order.id, url, state: checkout.state };
  });
export const verifyCoinPurchase = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input)).handler(async ({ context, data }) => {
    const { data: raw, error } = await context.supabase.rpc("coin_get_wallet");
    if (error) throw new Error(error.message);
    const order = walletSchema.parse(raw).orders.find((o) => o.id === data.orderId);
    if (!order) throw new Error("Achat introuvable dans votre portefeuille");
    const { requireCoinProvider } = await import("./coin-providers.server");
    const proof = providerProofSchema.parse(await requireCoinProvider(order.provider).verifyPayment(order));
    assertMatchingProof(order, proof);
    if (proof.state === "succeeded") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: settleError } = await supabaseAdmin.rpc("coin_settle_verified", { _order: order.id, _provider: proof.provider, _reference: proof.externalReference, _event: proof.eventId, _amount_minor: Number(proof.amountMinor), _currency: proof.currency });
      if (settleError) throw new Error(settleError.message);
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: stateError } = await supabaseAdmin.rpc("coin_provider_state", { _order: order.id, _provider: proof.provider, _state: proof.state });
      if (stateError) throw new Error(stateError.message);
    }
    return { state: proof.state }; // No Coins credited for pending, failed, or cancelled provider responses.
  });
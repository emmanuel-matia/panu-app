import { z } from 'zod';

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing';
export const PANU_ANDROID_PACKAGE = 'site.panu.app';
export const playProductSchema = z.object({
  itemId: z.string().min(1).max(100), title: z.string().min(1),
  price: z.object({ currency: z.string().regex(/^[A-Z]{3}$/), value: z.string().regex(/^\d+(\.\d+)?$/) }),
});
export type PlayProduct = z.infer<typeof playProductSchema>;

// Only a response read independently from Google may enter this validator.
// This is NOT a receipt or a monetary settlement proof for coin_settle_verified.
export const playPurchaseSchema = z.object({
  orderId: z.string().min(1).max(160).optional(),
  purchaseStateContext: z.object({ purchaseState: z.enum(['PURCHASED', 'PENDING', 'CANCELLED', 'PURCHASE_STATE_UNSPECIFIED']) }),
  testPurchaseContext: z.unknown().optional(),
  obfuscatedExternalAccountId: z.string().optional(),
  obfuscatedExternalProfileId: z.string().optional(),
  productLineItem: z.array(z.object({
    productId: z.string(),
    productOfferDetails: z.object({
      quantity: z.number().int(), refundableQuantity: z.number().int(),
      consumptionState: z.enum(['CONSUMPTION_STATE_YET_TO_BE_CONSUMED', 'CONSUMPTION_STATE_CONSUMED', 'CONSUMPTION_STATE_UNSPECIFIED']),
    }),
  })),
});

export function assertRealPlayPurchase(raw: unknown, expected: { productId: string; accountBinding: string; orderBinding: string }) {
  const purchase = playPurchaseSchema.parse(raw);
  if ('testPurchaseContext' in purchase) throw new Error('Un achat de test ne crédite pas le portefeuille réel');
  if (purchase.purchaseStateContext.purchaseState !== 'PURCHASED') throw new Error('Transaction Google Play non confirmée');
  if (!purchase.orderId) throw new Error('Référence Google Play manquante');
  if (!expected.accountBinding || !expected.orderBinding || purchase.obfuscatedExternalAccountId !== expected.accountBinding || purchase.obfuscatedExternalProfileId !== expected.orderBinding) throw new Error('Achat non lié à ce compte et à cette commande PANU');
  const item = purchase.productLineItem[0];
  if (purchase.productLineItem.length !== 1 || !item || item.productId !== expected.productId) throw new Error('Produit Google Play incompatible');
  if (item.productOfferDetails.quantity !== 1 || item.productOfferDetails.refundableQuantity !== 1) throw new Error('Quantité ou remboursement Google Play incompatible');
  if (item.productOfferDetails.consumptionState !== 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED') throw new Error('Achat déjà consommé ou état inconnu');
  return { externalReference: purchase.orderId, productId: item.productId };
}

export function canUsePlayChannel(channel: { enabled: boolean; verified: boolean; provider: string }, providers: string[], supported: boolean, productId: string | null) {
  return channel.enabled && channel.verified && providers.includes(channel.provider) && supported && Boolean(productId);
}
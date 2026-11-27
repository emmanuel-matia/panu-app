import { describe, expect, it } from 'vitest';
import { assertRealPlayPurchase, canUsePlayChannel, PANU_ANDROID_PACKAGE } from './play-billing-rules';

// Fixtures are local tests only; no API, financial row, or wallet is created.
const expected = { productId: 'panu_coins_70', accountBinding: 'account-binding', orderBinding: 'order-binding' };
const purchase = {
  orderId: 'GPA.unit-test', purchaseStateContext: { purchaseState: 'PURCHASED' },
  obfuscatedExternalAccountId: expected.accountBinding, obfuscatedExternalProfileId: expected.orderBinding,
  productLineItem: [{ productId: expected.productId, productOfferDetails: { quantity: 1, refundableQuantity: 1, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' } }],
};
describe('Préparation Google Play — jamais de crédit sans confirmation réelle', () => {
  it('conserve l’identité Android PANU', () => expect(PANU_ANDROID_PACKAGE).toBe('site.panu.app'));
  it('valide seulement les références liées sans inventer un montant', () => expect(assertRealPlayPurchase(purchase, expected)).toEqual({ externalReference: 'GPA.unit-test', productId: 'panu_coins_70' }));
  it.each(['PENDING', 'CANCELLED', 'PURCHASE_STATE_UNSPECIFIED'])('refuse %s', (purchaseState) => expect(() => assertRealPlayPurchase({ ...purchase, purchaseStateContext: { purchaseState } }, expected)).toThrow());
  it('refuse une carte de test même si PURCHASED', () => expect(() => assertRealPlayPurchase({ ...purchase, testPurchaseContext: { fopType: 'TEST' } }, expected)).toThrow());
  it('refuse un autre compte', () => expect(() => assertRealPlayPurchase({ ...purchase, obfuscatedExternalAccountId: 'other' }, expected)).toThrow());
  it('refuse une autre commande', () => expect(() => assertRealPlayPurchase({ ...purchase, obfuscatedExternalProfileId: 'other' }, expected)).toThrow());
  it('refuse une référence manquante', () => expect(() => assertRealPlayPurchase({ ...purchase, orderId: undefined }, expected)).toThrow());
  it('refuse un autre produit', () => expect(() => assertRealPlayPurchase(purchase, { ...expected, productId: 'other' })).toThrow());
  it('refuse plusieurs produits', () => expect(() => assertRealPlayPurchase({ ...purchase, productLineItem: [...purchase.productLineItem, ...purchase.productLineItem] }, expected)).toThrow());
  it.each([
    { quantity: 2, refundableQuantity: 2, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' },
    { quantity: 1, refundableQuantity: 0, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' },
    { quantity: 1, refundableQuantity: 1, consumptionState: 'CONSUMPTION_STATE_CONSUMED' },
  ])('refuse quantité, remboursement ou consommation incompatibles', (productOfferDetails) => expect(() => assertRealPlayPurchase({ ...purchase, productLineItem: [{ productId: expected.productId, productOfferDetails }] }, expected)).toThrow());
});
describe('Disponibilité réelle Android', () => {
  const channel = { enabled: true, verified: true, provider: 'google_play' };
  it('bloque un navigateur sans Billing', () => expect(canUsePlayChannel(channel, ['google_play'], false, 'panu_coins_70')).toBe(false));
  it('bloque un produit absent', () => expect(canUsePlayChannel(channel, ['google_play'], true, null)).toBe(false));
  it('bloque sans prestataire vérifié', () => expect(canUsePlayChannel({ ...channel, verified: false }, ['google_play'], true, 'panu_coins_70')).toBe(false));
  it('bloque sans intégration serveur même sur Android', () => expect(canUsePlayChannel(channel, [], true, 'panu_coins_70')).toBe(false));
});
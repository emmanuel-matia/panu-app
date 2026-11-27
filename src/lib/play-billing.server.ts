import { PANU_ANDROID_PACKAGE, playPurchaseSchema } from './play-billing-rules';

/** Preparation only: no registered adapter, endpoint, or wallet write.
 * OAuth must be supplied by the authorized Play Console connection server-side.
 * Never accept an access token or a Google response as browser proof.
 */
export async function readGooglePlayPurchase(purchaseToken: string, authorizedAccessToken: string) {
  if (!purchaseToken || purchaseToken.length > 4096 || !authorizedAccessToken) throw new Error('Accès Google Play non configuré');
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PANU_ANDROID_PACKAGE}/purchases/productsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authorizedAccessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Google Play n’a pas confirmé cet achat');
  return playPurchaseSchema.parse(await response.json());
}
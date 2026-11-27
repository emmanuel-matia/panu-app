import { PLAY_BILLING_METHOD, playProductSchema, type PlayProduct } from './play-billing-rules';

interface DigitalGoodsService {
  getDetails(ids: string[]): Promise<unknown[]>;
}
type PlayWindow = Window & { getDigitalGoodsService?: (provider: string) => Promise<DigitalGoodsService | null> };

/** Load after hydration only. Android referrer is not proof that Billing works. */
export async function getPlayBillingService(): Promise<DigitalGoodsService | null> {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const browser = window as PlayWindow;
  if (!browser.getDigitalGoodsService) return null;
  try { return await browser.getDigitalGoodsService(PLAY_BILLING_METHOD); }
  catch { return null; }
}

export async function getPlayProducts(service: DigitalGoodsService, ids: string[]): Promise<PlayProduct[]> {
  const requested = [...new Set(ids.filter(Boolean))];
  if (!requested.length) return [];
  const raw = await service.getDetails(requested);
  return raw.flatMap((item) => {
    const parsed = playProductSchema.safeParse(item);
    return parsed.success && requested.includes(parsed.data.itemId) ? [parsed.data] : [];
  });
}
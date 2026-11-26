import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { creatorPercentSchema, giftConfigSchema, revenueConfigSchema } from './gifts-rules';

export const getGiftCatalogue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('gift_catalogue_list');
  if (error) throw new Error('Le catalogue des cadeaux est indisponible. Réessayez.');
  const { resolveGiftMedia } = await import('./gifts.server');
  return resolveGiftMedia(data);
});
export const getAdminGifts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('gift_admin_data');
  if (error) throw new Error(error.message);
  const parsed = z.object({ gifts: z.unknown(), config: revenueConfigSchema }).parse(data);
  const { resolveGiftMedia } = await import('./gifts.server');
  return { gifts: await resolveGiftMedia(parsed.gifts), config: parsed.config };
});
export const saveGiftConfig = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => giftConfigSchema.parse(input)).handler(async ({ context, data }) => {
  const { data: id, error } = await context.supabase.rpc('gift_admin_save', { _data: data });
  if (error) throw new Error(error.message);
  return { id };
});
export const saveGiftRevenueConfig = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ creatorPercent: creatorPercentSchema }).parse(input)).handler(async ({ context, data }) => {
  const { error } = await context.supabase.rpc('gift_admin_revenue_config', { _creator_percent: data.creatorPercent });
  if (error) throw new Error(error.message);
  return { ok: true };
});

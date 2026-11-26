import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { creatorPercentSchema, giftConfigSchema, revenueConfigSchema } from './gifts-rules';
import { giftQuoteInputSchema, giftQuoteSchema, giftSendInputSchema, giftSummarySchema } from './gifts-data';

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

export const findGiftRecipient = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({username:z.string().trim().min(1).max(64)}).parse(input)).handler(async({context,data})=>{
  const result=await context.supabase.rpc('gift_find_recipient',{_username:data.username});
  if(result.error) throw new Error(result.error.message);
  const {resolveGiftRecipient}=await import('./gifts.server');
  return resolveGiftRecipient(result.data);
});
export const quoteGift = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>giftQuoteInputSchema.parse(input)).handler(async({context,data})=>{
  const result=await context.supabase.rpc('gift_quote',{_gift:data.giftId,_kind:data.kind,_target:data.targetId});
  if(result.error) throw new Error(result.error.message);
  return giftQuoteSchema.parse(result.data);
});
export const sendGift = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>giftSendInputSchema.parse(input)).handler(async({context,data})=>{
  const result=await context.supabase.rpc('gift_send',{_gift:data.giftId,_kind:data.kind,_target:data.targetId,_expected_price:Number(data.expectedPrice),_request:data.requestId,_message:data.message});
  if(result.error) throw new Error(result.error.message);
  return z.object({id:z.string().uuid(),duplicate:z.boolean(),balance:z.string()}).parse(result.data);
});
export const getGiftHistory = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({direction:z.enum(['sent','received','admin']),offset:z.number().int().min(0).max(1000000).default(0)}).parse(input)).handler(async({context,data})=>{
  const result=await context.supabase.rpc('gift_history',{_direction:data.direction,_offset:data.offset});
  if(result.error) throw new Error(result.error.message);
  const {resolveGiftHistory}=await import('./gifts.server');
  return resolveGiftHistory(result.data);
});
export const getGiftSummary = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const result=await context.supabase.rpc('gift_revenue_summary');
  if(result.error) throw new Error(result.error.message);
  return giftSummarySchema.parse(result.data);
});
export const getGiftNotificationContext = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const result=await context.supabase.rpc('gift_notification_context');
  if(result.error)throw new Error(result.error.message);
  return z.array(z.object({notificationId:z.string().uuid(),giftName:z.string(),message:z.string(),targetKind:z.enum(['profile','post','live']),targetId:z.string().uuid()})).parse(result.data);
});

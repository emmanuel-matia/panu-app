import { z } from 'zod';

export const giftAnimationSchema = z.enum(['none', 'pulse', 'float', 'sparkle']);
export const giftImagePathSchema = z.string().max(400).refine((v) => /^\/__l5e\/assets-v1\/[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/.test(v) || /^[a-f0-9-]{36}\/gift-[a-f0-9-]{36}\.(webp|png|jpg|gif)$/.test(v), 'Importez une illustration PANU autorisée');
export const giftConfigSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/, 'Identifiant : lettres minuscules, chiffres et tirets'),
  name: z.string().trim().min(1).max(80), description: z.string().max(500), image_path: giftImagePathSchema,
  animation: giftAnimationSchema,
  animation_path: z.string().regex(/^[a-f0-9-]{36}\/gift-[a-f0-9-]{36}\.gif$/).nullable(),
  price_coins: z.string().regex(/^[1-9]\d*$/, 'Prix entier positif').refine((v) => /^[1-9]\d*$/.test(v) && BigInt(v) <= 1000000000n, 'Prix entier positif, limité à un milliard de Coins'),
  category: z.string().trim().min(1).max(40), active: z.boolean(), available: z.boolean(), popular: z.boolean(),
  position: z.coerce.number().int().min(0).max(1000000),
});
export const giftSchema = giftConfigSchema.extend({ id: z.string().uuid(), created_at: z.string(), updated_at: z.string() });
export type Gift = z.infer<typeof giftSchema>;
export const revenueConfigSchema = z.object({ creator_percent: z.coerce.number().min(0).max(100), panu_percent: z.coerce.number().min(0).max(100), calculation_basis: z.literal('net_verified_after_provider_fees') }).refine((v) => v.creator_percent + v.panu_percent === 100, 'Le partage doit totaliser 100 %');
export const creatorPercentSchema = z.number().min(0).max(100).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Deux décimales maximum');
export function remainingGiftBalance(balance: string, price: string): string | null {
  const left = BigInt(balance) - BigInt(price);
  return left >= 0n ? left.toString() : null;
}
export function giftMatchesFilter(gift: Gift, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'popular') return gift.popular;
  if (filter === 'animated') return gift.animation !== 'none' || Boolean(gift.animation_path);
  if (filter === 'special') return gift.category === 'special' || gift.slug === 'super-cadeau-panu' || gift.slug === 'cadeau-mystere';
  return gift.category === filter;
}
export function giftCategoryLabel(category: string): string {
  return ({ accessible: 'Simple', populaire: 'Populaire', premium: 'Premium', special: 'Spécial' } as Record<string,string>)[category] ?? category;
}

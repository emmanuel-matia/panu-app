import { giftSchema } from './gifts-rules';
import { signStoragePaths } from './supabase-public.server';
import { z } from 'zod';

export async function resolveGiftMedia(raw: unknown) {
  const gifts = z.array(giftSchema).parse(raw);
  const items = gifts.flatMap((g) => [g.image_path, g.animation_path].filter((p): p is string => Boolean(p)).filter((p) => !p.startsWith('/')).map((path) => ({ path, ownerId: path.split('/')[0] })));
  const signed = await signStoragePaths('avatars', items, 600);
  return gifts.map((g) => ({ ...g, imageUrl: g.image_path.startsWith('/__l5e/assets-v1/') ? g.image_path : signed.get(g.image_path) ?? null, animationUrl: g.animation_path ? signed.get(g.animation_path) ?? null : null }));
}

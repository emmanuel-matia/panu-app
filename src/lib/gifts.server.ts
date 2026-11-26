import { giftSchema } from './gifts-rules';
import { signStoragePaths } from './supabase-public.server';
import { z } from 'zod';
import { giftHistorySchema, giftRecipientSchema } from './gifts-data';

export async function resolveGiftMedia(raw: unknown) {
  const gifts = z.array(giftSchema).parse(raw);
  const items = gifts.flatMap((g) => [g.image_path, g.animation_path].filter((p): p is string => Boolean(p)).filter((p) => !p.startsWith('/')).map((path) => ({ path, ownerId: path.split('/')[0] })));
  const signed = await signStoragePaths('avatars', items, 600);
  return gifts.map((g) => ({ ...g, imageUrl: g.image_path.startsWith('/__l5e/assets-v1/') ? g.image_path : signed.get(g.image_path) ?? null, animationUrl: g.animation_path ? signed.get(g.animation_path) ?? null : null }));
}

export async function resolveGiftRecipient(raw: unknown) {
  const recipient = giftRecipientSchema.parse(raw);
  const signed = await signStoragePaths('avatars', [{ path: recipient.avatarPath, ownerId: recipient.id }], 600, 256);
  return { id: recipient.id, username: recipient.username, displayName: recipient.displayName, avatarUrl: recipient.avatarPath ? signed.get(recipient.avatarPath) ?? null : null };
}

export async function resolveGiftHistory(raw: unknown) {
  const rows = giftHistorySchema.parse(raw);
  const signed = await signStoragePaths('avatars', rows.flatMap((r) => [
    { path: r.sender_avatar_path, ownerId: r.sender_id }, { path: r.recipient_avatar_path, ownerId: r.recipient_id },
    ...[r.image_path,r.animation_path].filter((p):p is string=>Boolean(p)&&!p?.startsWith('/')).map((path)=>({path,ownerId:path.split('/')[0]})),
  ]),600);
  return rows.map((r)=>({...r,imageUrl:r.image_path.startsWith('/__l5e/assets-v1/')?r.image_path:signed.get(r.image_path)??null,senderAvatarUrl:r.sender_avatar_path?signed.get(r.sender_avatar_path)??null:null,recipientAvatarUrl:r.recipient_avatar_path?signed.get(r.recipient_avatar_path)??null:null}));
}

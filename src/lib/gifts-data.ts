import { z } from 'zod';
export const giftTargetSchema = z.object({ kind: z.enum(['profile','post','live']), targetId: z.string().uuid() });
export type GiftTarget = z.infer<typeof giftTargetSchema>;
export const giftQuoteInputSchema = giftTargetSchema.extend({ giftId: z.string().uuid() });
export const giftSendInputSchema = giftQuoteInputSchema.extend({ expectedPrice: z.string().regex(/^[1-9]\d*$/).refine((s)=>/^[1-9]\d*$/.test(s)&&BigInt(s)<=1000000000n), requestId: z.string().uuid(), message: z.string().trim().max(250).default('') });
export const giftQuoteSchema = z.object({ giftId:z.string().uuid(),giftName:z.string(),price:z.string(),balance:z.string(),remaining:z.string().nullable(),recipientId:z.string().uuid(),recipientName:z.string(),recipientUsername:z.string() });
export const giftRecipientSchema = z.object({ id:z.string().uuid(),username:z.string(),displayName:z.string(),avatarPath:z.string().nullable() });
export const giftEarningSchema = z.object({ currency:z.string(),exponent:z.number().int(),net_minor:z.string(),creator_minor:z.string(),panu_minor:z.string(),status:z.literal('pending') });
export const giftHistorySchema = z.array(z.object({
 id:z.string().uuid(),sender_id:z.string().uuid(),recipient_id:z.string().uuid(),sender_username:z.string(),sender_name:z.string(),sender_avatar_path:z.string().nullable(),recipient_username:z.string(),recipient_name:z.string(),recipient_avatar_path:z.string().nullable(),
 gift_name:z.string(),image_path:z.string(),animation:z.string(),animation_path:z.string().nullable(),coins_spent:z.string(),message:z.string(),target_kind:z.enum(['profile','post','live']),target_id:z.string().uuid(),status:z.literal('sent'),created_at:z.string(),creator_percent:z.coerce.number(),panu_percent:z.coerce.number(),earnings:z.array(giftEarningSchema),notification_id:z.string().uuid().nullable(),
}));
export const giftSummarySchema = z.object({ received:z.number(),sent:z.number(),currencies:z.array(z.object({currency:z.string(),exponent:z.number(),pending_minor:z.string()})) });
export const providerNetProofSchema = z.object({
 orderId:z.string().uuid(),provider:z.string().regex(/^[a-z0-9_]{2,40}$/),externalReference:z.string().trim().min(1).max(160),verificationReference:z.string().trim().min(1).max(160),
 grossMinor:z.string().regex(/^[1-9]\d{0,12}$/),feeMinor:z.string().regex(/^\d{1,13}$/),netMinor:z.string().regex(/^\d{1,13}$/),currency:z.string().regex(/^[A-Z]{3}$/),
}).superRefine((value,ctx)=>{
 if(!/^\d+$/.test(value.grossMinor)||!/^\d+$/.test(value.feeMinor)||!/^\d+$/.test(value.netMinor))return;
 if(BigInt(value.feeMinor)+BigInt(value.netMinor)!==BigInt(value.grossMinor))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Frais et montant net incompatibles'});
});
export type GiftHistoryEntry = z.infer<typeof giftHistorySchema>[number];
export function formatGiftMoney(minor: string, exponent: number, currency: string) {
 const value=BigInt(minor), scale=10n**BigInt(exponent);
 const whole=(value/scale).toLocaleString('fr-FR');
 const fraction=exponent ? ','+(value%scale).toString().padStart(exponent,'0') : '';
 return `${whole}${fraction} ${currency}`;
}
/** Mirrors the database's cumulative minor-unit allocation; never defines a Coins/USD rate. */
export function allocateVerifiedNet(netMinor: bigint, totalCoins: bigint, consumed: bigint, spend: bigint, creatorBps: bigint) {
 if(netMinor<0n||totalCoins<=0n||consumed<0n||spend<=0n||consumed+spend>totalCoins||creatorBps<0n||creatorBps>10000n) throw new Error('Allocation invalide');
 const net=netMinor*(consumed+spend)/totalCoins-netMinor*consumed/totalCoins;
 const creator=net*creatorBps/10000n;
 return {net,creator,panu:net-creator};
}

import { describe,expect,it } from 'vitest';
import { allocateVerifiedNet,formatGiftMoney,giftSendInputSchema,providerNetProofSchema } from './gifts-data';

describe('Revenus cadeaux issus du net vérifié',()=>{
 it('répartit 50/50 le net réellement encaissé après frais',()=>{
  // A verified 100-minor-unit receipt, 20 actual fee units, 100 Coins bought.
  const share=allocateVerifiedNet(80n,100n,0n,50n,5000n);
  expect(share).toEqual({net:40n,creator:20n,panu:20n});
 });
 it('ne définit pas un taux Coins/USD uniforme pour des packs de prix différents',()=>{
  expect(allocateVerifiedNet(100n,100n,0n,10n,5000n).net).toBe(10n);
  expect(allocateVerifiedNet(500n,600n,0n,10n,5000n).net).toBe(8n);
 });
 it('répartit le net du lot sur Coins achetés et bonus sans inventer de revenu',()=>{
  expect(allocateVerifiedNet(100n,120n,100n,20n,5000n).net).toBe(17n);
 });
 it('conserve exactement le net du lot malgré les arrondis successifs',()=>{
  let total=0n;
  for(let used=0n;used<70n;used+=5n)total+=allocateVerifiedNet(99n,70n,used,5n,5000n).net;
  expect(total).toBe(99n);
 });
 it('interdit de consommer deux fois les derniers Coins du même lot',()=>{
  expect(()=>allocateVerifiedNet(100n,100n,99n,5n,5000n)).toThrow('Allocation invalide');
 });
 it('conserve les très grands montants sans conversion flottante',()=>{
  expect(formatGiftMoney('99999999999999999',2,'USD')).toBe('999 999 999 999 999,99 USD');
 });
 it('refuse une preuve de net dont les frais ne correspondent pas au brut',()=>{
  expect(providerNetProofSchema.safeParse({orderId:'11111111-1111-4111-8111-111111111111',provider:'google_play',externalReference:'real-reference',verificationReference:'settlement-reference',grossMinor:'100',feeMinor:'20',netMinor:'90',currency:'USD'}).success).toBe(false);
 });
 it('refuse une valeur non numérique dans la preuve sans exception de parsing',()=>{
  expect(providerNetProofSchema.safeParse({orderId:'11111111-1111-4111-8111-111111111111',provider:'google_play',externalReference:'real-reference',verificationReference:'settlement-reference',grossMinor:'100',feeMinor:'bad',netMinor:'80',currency:'USD'}).success).toBe(false);
 });
});
describe('Confirmation des cadeaux',()=>{
 const input={giftId:'11111111-1111-4111-8111-111111111111',kind:'profile',targetId:'22222222-2222-4222-8222-222222222222',expectedPrice:'5',requestId:'33333333-3333-4333-8333-333333333333',message:'Merci'};
 it('exige une référence idempotente valide',()=>{expect(giftSendInputSchema.safeParse({...input,requestId:''}).success).toBe(false);});
 it('ne permet pas un message dépassant 250 caractères',()=>{expect(giftSendInputSchema.safeParse({...input,message:'a'.repeat(251)}).success).toBe(false);});
 it('refuse un prix fractionnaire ou négatif',()=>{expect(giftSendInputSchema.safeParse({...input,expectedPrice:'5.5'}).success).toBe(false);expect(giftSendInputSchema.safeParse({...input,expectedPrice:'-5'}).success).toBe(false);});
});

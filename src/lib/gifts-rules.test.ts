import { describe, expect, it } from 'vitest';
import catalogue from '@/features/gifts/launch-catalogue.json';
import { creatorPercentSchema, giftConfigSchema, remainingGiftBalance, revenueConfigSchema } from './gifts-rules';
const prices = [
  ['Petit cœur',5],['Cœur rouge',10],['Rose',20],['Étoile',25],['Bisou',30],['Fleur',50],
  ['Bouquet de roses',100],['Trophée',150],['Étoiles brillantes',200],['Cœur animé',250],['Surprise',300],['Cadeau mystère',500],
  ['Couronne',1000],['Diamant',1500],['Fusée',2000],['Lion',3000],['Palais',5000],['Super cadeau PANU',10000],
] as const;
describe('Grille de cadeaux approuvée', () => {
  for (const [name,price] of prices) it(`${name} coûte ${price} Coins`, () => { expect(catalogue.find((g) => g.name === name)?.price_coins).toBe(String(price)); });
  it('contient exactement 18 identifiants uniques', () => { expect(catalogue).toHaveLength(18); expect(new Set(catalogue.map((g) => g.slug)).size).toBe(18); });
  it('valide chaque cadeau réel', () => { for (const g of catalogue) expect(giftConfigSchema.safeParse({...g,animation_path:null}).success).toBe(true); });
});
describe('Partage et règles financières', () => {
  it('accepte le partage approuvé 50 % / 50 % sur le net après frais', () => { expect(revenueConfigSchema.parse({creator_percent:50,panu_percent:50,calculation_basis:'net_verified_after_provider_fees'}).creator_percent).toBe(50); });
  it('refuse une base brute ou un taux de conversion inventé', () => { expect(revenueConfigSchema.safeParse({creator_percent:50,panu_percent:50,calculation_basis:'gross'}).success).toBe(false); });
  it('refuse une répartition qui ne totalise pas 100 %', () => { expect(revenueConfigSchema.safeParse({creator_percent:50,panu_percent:60,calculation_basis:'net_verified_after_provider_fees'}).success).toBe(false); });
  it('refuse un pourcentage hors limites ou trop précis', () => { expect(creatorPercentSchema.safeParse(101).success).toBe(false); expect(creatorPercentSchema.safeParse(50.001).success).toBe(false); });
  it('ne permet pas de solde négatif', () => { expect(remainingGiftBalance('4','5')).toBeNull(); expect(remainingGiftBalance('5','5')).toBe('0'); });
  it('refuse un prix nul ou fractionnaire', () => { const g=catalogue[0]; if(!g) throw new Error('Catalogue manquant'); expect(giftConfigSchema.safeParse({...g,animation_path:null,price_coins:'0'}).success).toBe(false); expect(giftConfigSchema.safeParse({...g,animation_path:null,price_coins:'5.5'}).success).toBe(false); });
});

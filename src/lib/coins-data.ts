import { z } from "zod";

const integerString = z.union([z.string().regex(/^-?\d+$/), z.number().int().safe()]).transform(String);
export const coinOrderSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid().optional(), pack_name: z.string(), coins: integerString, bonus: integerString,
  amount_minor: integerString, exponent: z.number().int(), currency: z.string(), country: z.string(), provider: z.string(), channel: z.string(),
  status: z.string(), external_reference: z.string().nullable(), created_at: z.string(),
});
export const walletSchema = z.object({
  balance: integerString, orders: z.array(coinOrderSchema),
  ledger: z.array(z.object({ id: z.string(), amount: integerString, kind: z.string(), reference: z.string(), order_id: z.string().nullable(), recipient_id: z.string().nullable(), gift_id: z.string().nullable(), created_at: z.string() })),
  methods: z.array(z.object({ id: z.string(), type: z.string(), provider: z.string(), label: z.string(), account_identifier: z.string(), currency: z.string(), is_default: z.boolean(), status: z.string() })),
});
export const catalogueSchema = z.object({
  packs: z.array(z.object({ id: z.string(), pack_id: z.string(), name: z.string(), coins: integerString, bonus: integerString, popular: z.boolean(), country: z.string(), currency: z.string(), amount_minor: integerString, exponent: z.number(), google_product_id: z.string().nullable() })),
  channels: z.array(z.object({ id: z.string(), provider: z.string(), name: z.string(), channel: z.string(), country: z.string(), currency: z.string(), enabled: z.boolean(), verified: z.boolean() })),
});
export const adminCoinsSchema = z.object({
  packs: z.array(z.object({ id: z.string(), name: z.string(), coins: integerString, bonus: integerString, popular: z.boolean(), active: z.boolean(), created_at: z.string(), updated_at: z.string() })),
  prices: z.array(z.object({ id: z.string(), pack_id: z.string(), country: z.string(), currency: z.string(), amount_minor: integerString, exponent: z.number(), google_product_id: z.string().nullable(), active: z.boolean(), created_at: z.string(), updated_at: z.string() })),
  channels: z.array(z.object({ id: z.string(), provider: z.string(), name: z.string(), channel: z.string(), country: z.string(), currency: z.string(), enabled: z.boolean(), verified_at: z.string().nullable() })),
  orders: z.array(coinOrderSchema),
});
export type CoinOrder = z.infer<typeof coinOrderSchema>;
export type WalletData = z.infer<typeof walletSchema>;
export type CoinCatalogue = z.infer<typeof catalogueSchema>;
export type AdminCoinsData = z.infer<typeof adminCoinsSchema>;
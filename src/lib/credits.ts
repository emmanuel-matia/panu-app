/** Règles des crédits PANU (sans dépendance navigateur/serveur). */

/** Crédits offerts une seule fois à chaque nouveau compte (valeur appliquée par la base). */
export const WELCOME_CREDITS = 60;

/** Coût en crédits d'une génération réussie, par outil du Studio IA. */
export const AI_CREDIT_COSTS = {
  text: 1,
  image: 2,
  voice: 2,
  music: 5,
  video: 10,
} as const;

export type AiCreditKind = keyof typeof AI_CREDIT_COSTS;

export const PLAN_LABELS = { free: "Free", premium: "Premium", pro: "Pro" } as const;
export type Plan = keyof typeof PLAN_LABELS;

/** L'utilisateur peut-il lancer cette génération avec son solde ? */
export function canAfford(balance: number | null | undefined, kind: AiCreditKind): boolean {
  return (balance ?? 0) >= AI_CREDIT_COSTS[kind];
}

export function creditsLabel(amount: number): string {
  return `${amount} crédit${amount > 1 ? "s" : ""}`;
}

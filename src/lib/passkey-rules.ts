/** Règles de la sécurité biométrique (passkeys). Aucune empreinte n'est jamais lue ni stockée par PANU. */

export const BIOMETRIC_CONSENT_VERSION = "1.0";
/** Durée de validité d'une confirmation renforcée (doit rester égale à celle de `assert_step_up` en base). */
export const STEP_UP_MINUTES = 10;
/** Durée de vie d'un défi WebAuthn, en secondes (usage unique). */
export const CHALLENGE_TTL_SECONDS = 300;
/** Nombre maximal de défis demandés par une même adresse IP sur la fenêtre de limitation. */
export const MAX_CHALLENGES_PER_IP = 30;
export const CHALLENGE_WINDOW_MINUTES = 10;
export const MAX_PASSKEYS_PER_USER = 10;

export type StepUpMethod = "passkey" | "password";

/** Méthode de confirmation exigée : la passkey si le compte en possède une, sinon le mot de passe (secours). */
export function requiredStepUpMethod(passkeyCount: number): StepUpMethod {
  return passkeyCount > 0 ? "passkey" : "password";
}

export function isStepUpFresh(
  verifiedAt: Date,
  now: Date,
  method: StepUpMethod,
  passkeyCount: number,
): boolean {
  const ageMs = now.getTime() - verifiedAt.getTime();
  if (ageMs < 0 || ageMs > STEP_UP_MINUTES * 60_000) return false;
  return passkeyCount > 0 ? method === "passkey" : true;
}

export function isChallengeExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function isThrottled(recentChallengesFromIp: number): boolean {
  return recentChallengesFromIp >= MAX_CHALLENGES_PER_IP;
}

/** Nom d'appareil lisible, sans données personnelles. */
export function deviceLabelFromUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const os = ua.includes("android")
    ? "Android"
    : /iphone|ipad|ios/.test(ua)
      ? "iPhone / iPad"
      : ua.includes("windows")
        ? "Windows"
        : ua.includes("mac os")
          ? "Mac"
          : ua.includes("linux")
            ? "Linux"
            : "Appareil";
  return os;
}

export const STEP_UP_REQUIRED_MESSAGE = "Confirmation de sécurité requise";

export function isStepUpRequiredError(message: string | undefined | null): boolean {
  return Boolean(message && message.includes(STEP_UP_REQUIRED_MESSAGE));
}

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

import { supabase } from "@/integrations/supabase/client";

import {
  passkeyLoginOptions,
  passkeyLoginVerify,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyStepUpOptions,
  passkeyStepUpVerify,
} from "./passkeys.functions";

export { browserSupportsWebAuthn, platformAuthenticatorIsAvailable };

/** Traduit les erreurs du navigateur en message clair (annulation, appareil sans biométrie…). */
export function passkeyErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "NotAllowedError") return "Vérification annulée ou expirée sur l'appareil.";
  if (name === "InvalidStateError") return "Cet appareil est déjà enregistré.";
  if (name === "NotSupportedError") return "Cet appareil ne prend pas en charge les passkeys.";
  if (name === "SecurityError") return "Les passkeys ne fonctionnent pas dans cet aperçu intégré. Ouvrez PANU dans un onglet du navigateur.";
  return message || "La vérification a échoué.";
}

export async function registerPasskey(): Promise<void> {
  const { challengeId, options } = await passkeyRegisterOptions();
  const response = await startRegistration({ optionsJSON: options });
  await passkeyRegisterVerify({ data: { challengeId, response: response as unknown as Record<string, unknown> } });
}

/** Connexion sans mot de passe : l'appareil vérifie l'empreinte/visage, puis la session est ouverte. */
export async function signInWithPasskey(): Promise<void> {
  const { challengeId, options } = await passkeyLoginOptions();
  const response = await startAuthentication({ optionsJSON: options });
  const { tokenHash } = await passkeyLoginVerify({ data: { challengeId, response: response as unknown as Record<string, unknown> } });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) throw new Error("Connexion par passkey impossible. Utilisez votre mot de passe.");
}

/** Confirmation renforcée avant une action sensible. */
export async function confirmWithPasskey(): Promise<void> {
  const { challengeId, options } = await passkeyStepUpOptions();
  const response = await startAuthentication({ optionsJSON: options });
  await passkeyStepUpVerify({ data: { challengeId, response: response as unknown as Record<string, unknown> } });
}

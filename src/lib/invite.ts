/**
 * Invitations et partage côté navigateur. Aucun message n'est jamais envoyé automatiquement :
 * chaque lien ouvre l'application choisie par l'utilisateur, qui décide lui-même du destinataire.
 */
import { cleanReferralCode } from "./prefs";

const PENDING_REF_KEY = "panu-pending-referral";

/** Mémorise le code reçu dans un lien (?ref=…) jusqu'à la création du compte. */
export function capturePendingReferral(search: string) {
  if (typeof window === "undefined") return;
  const code = cleanReferralCode(new URLSearchParams(search).get("ref"));
  if (code) window.localStorage.setItem(PENDING_REF_KEY, code);
}

export function readPendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  return cleanReferralCode(window.localStorage.getItem(PENDING_REF_KEY));
}

export function clearPendingReferral() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_REF_KEY);
}

export type ShareChannel = "whatsapp" | "sms" | "messenger" | "telegram" | "email";

/** Adresse qui ouvre l'application de partage choisie avec le texte pré-rempli. */
export function shareUrl(channel: ShareChannel, text: string, url: string): string {
  const message = `${text} ${url}`.trim();
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    case "sms":
      return `sms:?&body=${encodeURIComponent(message)}`;
    case "messenger":
      return `fb-messenger://share/?link=${encodeURIComponent(url)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent("Rejoins-moi sur PANU")}&body=${encodeURIComponent(message)}`;
  }
}

/** Partage natif du téléphone si disponible ; renvoie false si l'utilisateur annule ou si absent. */
export async function nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

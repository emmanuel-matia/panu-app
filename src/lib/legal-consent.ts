import { LEGAL_PUBLISHER } from "./legal-documents";

/** Version des documents juridiques que l'utilisateur accepte aujourd'hui. */
export const CONSENT_VERSION: string = LEGAL_PUBLISHER.version;

/** Documents acceptés ensemble à l'inscription. */
export const CONSENT_DOCUMENTS = ["cgu", "confidentialite"] as const;

export type ConsentSource = "inscription" | "google" | "acceptation";
export type PendingConsent = { version: string; source: ConsentSource; checkedAt: string };

const KEY = "panu.pendingConsent";
const SOURCES: ConsentSource[] = ["inscription", "google", "acceptation"];

/** Lit un consentement en attente (stocké sur l'appareil ou dans les métadonnées du compte). */
export function parsePendingConsent(raw: unknown): PendingConsent | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const { version, source, checkedAt } = value as Record<string, unknown>;
  if (typeof version !== "string" || version.length === 0) return null;
  if (typeof source !== "string" || !SOURCES.includes(source as ConsentSource)) return null;
  if (typeof checkedAt !== "string" || Number.isNaN(Date.parse(checkedAt))) return null;
  return { version, source: source as ConsentSource, checkedAt };
}

export function makePendingConsent(source: ConsentSource, now: Date = new Date()): PendingConsent {
  return { version: CONSENT_VERSION, source, checkedAt: now.toISOString() };
}

export function savePendingConsent(consent: PendingConsent): void {
  window.localStorage.setItem(KEY, JSON.stringify(consent));
}

export function readPendingConsent(): PendingConsent | null {
  return parsePendingConsent(window.localStorage.getItem(KEY));
}

export function clearPendingConsent(): void {
  window.localStorage.removeItem(KEY);
}

/** Un compte doit (ré)accepter quand il n'a jamais accepté la version courante. */
export function needsConsent(acceptedVersions: string[], current: string = CONSENT_VERSION): boolean {
  return !acceptedVersions.includes(current);
}

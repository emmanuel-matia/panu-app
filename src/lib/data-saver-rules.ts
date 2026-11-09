/**
 * Règles d'économie de données (module pur, testé dans data-saver-rules.test.ts).
 * Le mode choisi par l'utilisateur est durci automatiquement quand le téléphone signale
 * une connexion lente ou l'économiseur de données Android.
 */
import type { DataMode } from "./prefs";

export type ConnectionInfo = { type?: string | undefined; effectiveType?: string | undefined; saveData?: boolean | undefined } | undefined;

const SLOW = new Set(["slow-2g", "2g", "3g"]);

export function isSlowConnection(c: ConnectionInfo): boolean {
  return Boolean(c?.saveData || (c?.effectiveType && SLOW.has(c.effectiveType)));
}

export function isWifi(c: ConnectionInfo): boolean {
  return c?.type === "wifi" || c?.type === "ethernet";
}

/** Mode réellement appliqué : une connexion lente ou l'économiseur Android impose l'économie maximale. */
export function effectiveDataMode(mode: DataMode, legacySaver: boolean, c: ConnectionInfo): DataMode {
  if (legacySaver || isSlowConnection(c)) return "max";
  return mode;
}

/** Lecture automatique : jamais en économie maximale, ni hors Wi-Fi si l'utilisateur l'a demandé. */
export function autoplayAllowed(mode: DataMode, heavyWifiOnly: boolean, c: ConnectionInfo): boolean {
  if (mode === "max") return false;
  if (heavyWifiOnly && !isWifi(c)) return false;
  return true;
}

/**
 * Préchargement d'une vidéo : seule la vidéo à l'écran charge ses métadonnées ;
 * en économie maximale, rien n'est chargé avant que l'utilisateur appuie sur Lire.
 */
export function videoPreload(mode: DataMode, isActive: boolean): "none" | "metadata" | "auto" {
  if (mode === "max") return "none";
  if (!isActive) return "none";
  return mode === "high" ? "auto" : "metadata";
}

/** Taille maximale (plus grand côté, px) et qualité des photos envoyées. */
export function uploadImageTarget(mode: DataMode): { maxSide: number; quality: number } {
  if (mode === "max") return { maxSide: 1080, quality: 0.7 };
  if (mode === "balanced") return { maxSide: 1440, quality: 0.8 };
  return { maxSide: 2048, quality: 0.88 };
}

/** Un envoi lourd (vidéo) est retenu hors Wi-Fi si l'utilisateur l'a demandé. */
export function heavyUploadBlocked(heavyWifiOnly: boolean, c: ConnectionInfo): boolean {
  return heavyWifiOnly && !isWifi(c);
}

/** Nombre de publications chargées par page du fil. */
export const FEED_PAGE_SIZE = 10;

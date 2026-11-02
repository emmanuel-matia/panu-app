/**
 * Préférences détaillées de l'utilisateur (colonne `user_settings.prefs`).
 * Module pur : aucune dépendance au navigateur ni au serveur, testé dans prefs.test.ts.
 */

export type ThemePref = "dark" | "light" | "system";
export type TextSize = "normal" | "large" | "xlarge";
export type Visibility = "public" | "followers" | "private";
export type AutoplayPref = "always" | "wifi" | "never";
export type Audience = "everyone" | "followers" | "nobody";

export const TAB_EXTRA_OPTIONS = ["messages", "notifications", "marketplace", "formations"] as const;
export type TabExtra = (typeof TAB_EXTRA_OPTIONS)[number];
export const MAX_TAB_EXTRAS = 2;

export type Prefs = {
  // Contenu
  show_videos: boolean;
  show_images: boolean;
  show_audio: boolean;
  recommendations: boolean;
  hidden_categories: string[];
  sensitive_content: "hide" | "show";
  personalized_trends: boolean;
  // Réactions
  show_reaction_counts: boolean;
  // Notifications (catégories sans colonne dédiée)
  notify_shares: boolean;
  notify_stories: boolean;
  notify_lives: boolean;
  notify_invitations: boolean;
  notify_ai: boolean;
  notify_payments: boolean;
  // Accessibilité
  text_size: TextSize;
  high_contrast: boolean;
  captions: boolean;
  reduce_motion: boolean;
  // Barre d'onglets
  tab_extras: TabExtra[];
  // Langue et région
  region: string;
  date_format: "dmy" | "mdy" | "ymd";
  time_format: "24h" | "12h";
  content_languages: string[];
  // Multimédia
  video_quality: "auto" | "high" | "data_saver";
  autoplay: AutoplayPref;
  start_muted: boolean;
  upload_quality: "high" | "standard";
  data_saver: boolean;
  allow_downloads: boolean;
  // Temps passé
  usage_reminder_minutes: number;
  break_reminder_minutes: number;
  // Navigateur
  open_links_in_app: boolean;
  // Apparence
  theme: ThemePref;
  // Galerie, publicités, accès anticipé
  gallery_suggestions: boolean;
  ads_on_content: boolean;
  early_access: boolean;
  // Audience par défaut
  default_post_visibility: Visibility;
  default_allow_comments: boolean;
  allow_sharing: boolean;
  // Informations visibles publiquement
  show_website: boolean;
  show_location: boolean;
  show_social: boolean;
  // Interactions
  allow_mentions: Audience;
  tag_approval: boolean;
  story_replies: Audience;
  story_sharing: boolean;
  story_archive: boolean;
  message_requests: Audience;
  profile_suggestions: boolean;
  // Parcours
  friends_prompt_dismissed: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  show_videos: true,
  show_images: true,
  show_audio: true,
  recommendations: true,
  hidden_categories: [],
  sensitive_content: "hide",
  personalized_trends: true,
  show_reaction_counts: true,
  notify_shares: true,
  notify_stories: true,
  notify_lives: true,
  notify_invitations: true,
  notify_ai: true,
  notify_payments: true,
  text_size: "normal",
  high_contrast: false,
  captions: true,
  reduce_motion: false,
  tab_extras: [],
  region: "CD",
  date_format: "dmy",
  time_format: "24h",
  content_languages: ["fr"],
  video_quality: "auto",
  autoplay: "always",
  start_muted: false,
  upload_quality: "high",
  data_saver: false,
  allow_downloads: true,
  usage_reminder_minutes: 0,
  break_reminder_minutes: 0,
  open_links_in_app: true,
  theme: "dark",
  gallery_suggestions: false,
  ads_on_content: false,
  early_access: false,
  default_post_visibility: "public",
  default_allow_comments: true,
  allow_sharing: true,
  show_website: true,
  show_location: true,
  show_social: true,
  allow_mentions: "everyone",
  tag_approval: false,
  story_replies: "followers",
  story_sharing: true,
  story_archive: true,
  message_requests: "everyone",
  profile_suggestions: true,
  friends_prompt_dismissed: false,
};

/** Fusionne la valeur enregistrée avec les valeurs par défaut, en ignorant les types inattendus. */
export function parsePrefs(raw: unknown): Prefs {
  const result: Prefs = { ...DEFAULT_PREFS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  const source = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
    const value = source[key];
    const fallback = DEFAULT_PREFS[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(fallback)) {
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        (result as Record<string, unknown>)[key] = value;
      }
    } else if (typeof value === typeof fallback) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  result.tab_extras = sanitizeTabExtras(result.tab_extras);
  return result;
}

/** Raccourcis supplémentaires : uniquement les options connues, sans doublon, 2 au maximum. */
export function sanitizeTabExtras(list: readonly string[]): TabExtra[] {
  const out: TabExtra[] = [];
  for (const item of list) {
    if ((TAB_EXTRA_OPTIONS as readonly string[]).includes(item) && !out.includes(item as TabExtra)) {
      out.push(item as TabExtra);
    }
    if (out.length === MAX_TAB_EXTRAS) break;
  }
  return out;
}

/** Thème effectivement appliqué. */
export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): "dark" | "light" {
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}

/** Lecture automatique autorisée selon la préférence et le type de connexion connu. */
export function shouldAutoplay(
  pref: AutoplayPref,
  connection: { type?: string | undefined; saveData?: boolean | undefined } | undefined,
  dataSaver: boolean,
): boolean {
  if (pref === "never") return false;
  if (dataSaver || connection?.saveData) return false;
  if (pref === "wifi") {
    // Le navigateur ne donne pas toujours le type de réseau : sans certitude, on ne lance pas.
    return connection?.type === "wifi" || connection?.type === "ethernet";
  }
  return true;
}

export type Period = "today" | "7d" | "30d" | "custom";

/** Bornes [from, to[ d'une période du tableau de bord. */
export function periodRange(
  period: Period,
  now: Date,
  custom?: { from: string; to: string },
): { from: Date; to: Date } | null {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (period === "today") return { from: startOfToday, to: now };
  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 6 : 29;
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - days);
    return { from, to: now };
  }
  if (!custom?.from || !custom.to) return null;
  const from = new Date(`${custom.from}T00:00:00`);
  const to = new Date(`${custom.to}T00:00:00`);
  to.setDate(to.getDate() + 1);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return null;
  if (to.getTime() - from.getTime() > 366 * 24 * 3600 * 1000) return null;
  return { from, to };
}

/** Numéros du répertoire prêts à comparer : chiffres uniquement, 8 minimum, sans doublon, 1000 maximum. */
export function normalizeContactNumbers(list: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of list) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) out.add(digits);
    if (out.size >= 1000) break;
  }
  return [...out];
}

/** Lien personnel d'invitation. */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/inscription?ref=${encodeURIComponent(code)}`;
}

/** Code de parrainage saisi ou reçu dans un lien : 6 à 12 lettres/chiffres, en majuscules. */
export function cleanReferralCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

/** Site web : ajoute https:// si besoin et refuse ce qui n'est pas une adresse web. */
export function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString().slice(0, 200);
  } catch {
    return null;
  }
}

/** Faut-il afficher cette publication dans le fil selon les préférences de contenu ? Ses propres publications restent visibles. */
export function postMatchesFeedPrefs(
  prefs: Pick<Prefs, "show_videos" | "show_images" | "show_audio" | "hidden_categories">,
  post: { kind: string; category: string | null; authorId: string },
  viewerId: string | undefined,
): boolean {
  if (viewerId && post.authorId === viewerId) return true;
  if (post.kind === "video" && !prefs.show_videos) return false;
  if (post.kind === "image" && !prefs.show_images) return false;
  if (post.kind === "audio" && !prefs.show_audio) return false;
  if (post.category && prefs.hidden_categories.includes(post.category)) return false;
  return true;
}

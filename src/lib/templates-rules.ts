/** Règles des modèles IA (templates) PANU — sans dépendance navigateur/serveur. */

export const TEMPLATE_CATEGORIES = [
  { id: "video", label: "Vidéo IA", detail: "Effets, transitions, animations" },
  { id: "photo", label: "Photo IA", detail: "Portraits, styles, affiches" },
  { id: "musique", label: "Musique", detail: "Chansons, jingles, clips" },
  { id: "business", label: "Business", detail: "Publicités, promos, produits" },
  { id: "reseaux", label: "Réseaux sociaux", detail: "Anniversaires, défis, stories" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["id"];
export type TemplateKind = "image" | "video" | "music";
export type TemplateInput = "none" | "photo";
export type FieldType = "text" | "textarea" | "select";

export const TEMPLATE_KINDS: { id: TemplateKind; label: string }[] = [
  { id: "video", label: "Vidéo" },
  { id: "image", label: "Image" },
  { id: "music", label: "Musique" },
];

export type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

/** Voix d'un modèle musique : imposée (chantée / instrumentale) ou au choix de l'utilisateur. */
export type VocalsPolicy = "choice" | "sung" | "instrumental";

export type TemplateSettings = {
  format?: "portrait" | "square" | "landscape";
  aspect?: "9:16" | "16:9";
  duration?: 5 | 10;
  seconds?: 15 | 30 | 60;
  /** Musique : voix chantée, instrumentale ou au choix. */
  vocals?: VocalsPolicy;
  /** Musique : étape « paroles » (écrites par l'utilisateur ou par l'IA). */
  lyrics?: boolean;
  /** Musique : clip vertical avec les photos / vidéos de l'utilisateur. */
  clip?: boolean;
  /** Musique : extrait de démonstration (lien https choisi par l'équipe). */
  demo?: string;
};

export type TemplateCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  subcategory: string;
  kind: TemplateKind;
  inputKind: TemplateInput;
  fields: TemplateField[];
  settings: TemplateSettings;
  creditCost: number;
  coverUrl: string | null;
  createdAt: string;
  usesTotal: number;
  uses7d: number;
  usedByMe: boolean;
};

export const FIELD_TEXT_MAX = 300;
export const FIELD_TEXTAREA_MAX = 600;
export const TEMPLATE_PROMPT_MAX = 1500;

export function isTemplateCategory(value: unknown): value is TemplateCategory {
  return TEMPLATE_CATEGORIES.some((c) => c.id === value);
}

export function categoryLabel(id: string): string {
  return TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Lit la description des champs stockée en base ; ignore tout élément mal formé. */
export function parseFields(raw: unknown): TemplateField[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f["id"] === "string" ? f["id"] : "";
    const label = typeof f["label"] === "string" ? f["label"] : "";
    const type = f["type"] === "textarea" || f["type"] === "select" ? f["type"] : "text";
    if (!/^[a-z][a-z0-9_]{0,23}$/.test(id) || !label) continue;
    const options = Array.isArray(f["options"])
      ? f["options"].filter((o): o is string => typeof o === "string" && o.length > 0 && o.length <= 120).slice(0, 12)
      : undefined;
    if (type === "select" && (!options || options.length === 0)) continue;
    out.push({
      id,
      label: label.slice(0, 60),
      type,
      required: f["required"] !== false,
      ...(typeof f["placeholder"] === "string" ? { placeholder: f["placeholder"].slice(0, 120) } : {}),
      ...(type === "select" && options ? { options } : {}),
    });
  }
  return out.slice(0, 8);
}

export function parseSettings(raw: unknown): TemplateSettings {
  if (!raw || typeof raw !== "object") return {};
  const s = raw as Record<string, unknown>;
  const out: TemplateSettings = {};
  if (s["format"] === "portrait" || s["format"] === "square" || s["format"] === "landscape") out.format = s["format"];
  if (s["aspect"] === "9:16" || s["aspect"] === "16:9") out.aspect = s["aspect"];
  if (s["duration"] === 5 || s["duration"] === 10) out.duration = s["duration"];
  if (s["seconds"] === 15 || s["seconds"] === 30 || s["seconds"] === 60) out.seconds = s["seconds"];
  if (s["vocals"] === "choice" || s["vocals"] === "sung" || s["vocals"] === "instrumental") out.vocals = s["vocals"];
  if (typeof s["lyrics"] === "boolean") out.lyrics = s["lyrics"];
  if (typeof s["clip"] === "boolean") out.clip = s["clip"];
  if (typeof s["demo"] === "string" && /^https:\/\/\S{8,500}$/.test(s["demo"])) out.demo = s["demo"];
  return out;
}

/* ---------- Modèles musique ---------- */

export const SONG_LANGUAGES = [
  { id: "fr", label: "Français", name: "French" },
  { id: "en", label: "Anglais", name: "English" },
  { id: "ln", label: "Lingala (prononciation non garantie)", name: "Lingala" },
  { id: "sw", label: "Swahili (prononciation non garantie)", name: "Swahili" },
] as const;
export type SongLanguage = (typeof SONG_LANGUAGES)[number]["id"];
export const LYRICS_MAX = 1500;
export const SONG_PROMPT_MAX = 4000;

/** Réglages musique effectifs (valeurs par défaut des anciens modèles : voix au choix, paroles et clip proposés). */
export function musicOptions(settings: TemplateSettings): { vocals: VocalsPolicy; lyrics: boolean; clip: boolean } {
  const vocals = settings.vocals ?? "choice";
  return { vocals, lyrics: vocals !== "instrumental" && settings.lyrics !== false, clip: settings.clip !== false };
}

/** Voix réellement utilisée : la règle du modèle l'emporte sur le choix envoyé par le navigateur. */
export function resolveVocals(policy: VocalsPolicy, requested: "sung" | "instrumental" | undefined): "sung" | "instrumental" {
  if (policy !== "choice") return policy;
  return requested ?? "sung";
}

/** Paroles saisies : sans caractères de contrôle, lignes vides réduites, longueur bornée. */
export function cleanLyrics(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/\{\{|\}\}/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LYRICS_MAX);
}

/** Nombre de lignes de paroles adapté à la durée (l'IA en écrit autant). */
export function lyricsLineCount(seconds: number): number {
  return seconds <= 15 ? 4 : seconds <= 30 ? 8 : 16;
}

/** Instruction finale envoyée au moteur musical (voix, langue, paroles exactes). */
export function buildSongPrompt(input: {
  base: string;
  vocals: "sung" | "instrumental";
  language: SongLanguage;
  lyrics: string;
}): string {
  if (input.vocals === "instrumental") return `${input.base} Instrumental only, no vocals.`.slice(0, SONG_PROMPT_MAX);
  const lang = SONG_LANGUAGES.find((l) => l.id === input.language)?.name ?? "French";
  const lyrics = cleanLyrics(input.lyrics);
  const head = `${input.base} Expressive lead vocals singing in ${lang}.`;
  if (!lyrics) return `${head} Original lyrics that fit the theme.`.slice(0, SONG_PROMPT_MAX);
  return `${head}\nLyrics (original, sing exactly these words):\n${lyrics}`.slice(0, SONG_PROMPT_MAX);
}

/** Moteurs réellement branchés dans PANU pour ce type de modèle (le premier est essayé en premier). */
export function templateEngines(kind: TemplateKind, input: TemplateInput): string[] {
  if (kind === "music") return ["ElevenLabs Music", "Gemini Lyria"];
  if (kind === "video") return ["Fal.ai (Kling)", "PixVerse"];
  return input === "photo" ? ["Gemini", "Stability AI", "Fal.ai"] : ["Fal.ai", "Gemini", "Stability AI", "Cloudflare"];
}

export function engineLabel(kind: TemplateKind, input: TemplateInput): string {
  const [first, ...rest] = templateEngines(kind, input);
  return rest.length ? `${first} (secours : ${rest.join(", ")})` : (first ?? "");
}

export function mediaNeeded(kind: TemplateKind, input: TemplateInput): string {
  if (input === "photo") return "1 photo";
  return kind === "music" ? "Texte uniquement" : "Texte uniquement";
}

export function resultLabel(kind: TemplateKind): string {
  return kind === "video" ? "Vidéo" : kind === "image" ? "Image" : "Musique";
}

export function costLabel(cost: number): string {
  return cost === 0 ? "Gratuit" : `${cost} crédit${cost > 1 ? "s" : ""}`;
}

export function compactUses(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".0", "")} k`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "")} M`;
}

export function usesLabel(n: number): string {
  return n === 0 ? "Pas encore utilisé" : `${compactUses(n)} utilisation${n > 1 ? "s" : ""}`;
}

function clean(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\{\{|\}\}/g, "").replace(/\s+/g, " ").trim();
}

export type InputResult = { ok: true; values: Record<string, string> } | { ok: false; error: string };

/** Vérifie les réponses de l'utilisateur au formulaire du modèle (utilisé aussi côté serveur). */
export function validateTemplateInputs(fields: TemplateField[], raw: Record<string, unknown>): InputResult {
  const values: Record<string, string> = {};
  for (const f of fields) {
    const input = typeof raw[f.id] === "string" ? clean(raw[f.id] as string) : "";
    if (!input) {
      if (f.required) return { ok: false, error: `Renseignez « ${f.label} ».` };
      values[f.id] = "";
      continue;
    }
    const max = f.type === "textarea" ? FIELD_TEXTAREA_MAX : FIELD_TEXT_MAX;
    if (input.length > max) return { ok: false, error: `« ${f.label} » est trop long (${max} caractères maximum).` };
    if (f.type === "select" && !f.options?.includes(input)) return { ok: false, error: `Choix invalide pour « ${f.label} ».` };
    values[f.id] = input;
  }
  return { ok: true, values };
}

/** Remplace les `{{champ}}` du modèle par les réponses validées. */
export function buildPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_m, id: string) => values[id] || "none").replace(/\s+/g, " ").trim();
}

/** Texte lisible d'une création (pour l'historique et la légende de publication). */
export function creationSummary(title: string, values: Record<string, string>): string {
  const parts = Object.values(values).filter(Boolean);
  return `${title}${parts.length ? ` — ${parts.join(" · ")}` : ""}`.slice(0, 300);
}

/** Les placeholders de l'instruction qui n'ont aucun champ correspondant (erreur de configuration). */
export function missingPlaceholders(template: string, fields: TemplateField[]): string[] {
  const ids = new Set(fields.map((f) => f.id));
  const found = [...template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)].map((m) => m[1] as string);
  return [...new Set(found)].filter((id) => !ids.has(id));
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ---------- Classements : calculés uniquement à partir des utilisations réelles ---------- */

/** Populaires : plus d'utilisations ces 7 derniers jours (puis au total). Exclut les modèles jamais utilisés. */
export function popularTemplates(list: TemplateCard[], limit = 10): TemplateCard[] {
  return list
    .filter((t) => t.uses7d > 0)
    .sort((a, b) => b.uses7d - a.uses7d || b.usesTotal - a.usesTotal)
    .slice(0, limit);
}

/** Plus utilisés : total d'utilisations depuis le début. Exclut les modèles jamais utilisés. */
export function mostUsedTemplates(list: TemplateCard[], limit = 10): TemplateCard[] {
  return list
    .filter((t) => t.usesTotal > 0)
    .sort((a, b) => b.usesTotal - a.usesTotal || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

/** Nouveaux : les plus récemment publiés. */
export function newTemplates(list: TemplateCard[], limit = 10): TemplateCard[] {
  return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
}

/**
 * Recommandés : modèles que je n'ai pas encore utilisés, dans les catégories où j'ai déjà créé,
 * les plus utilisés d'abord. Sans historique, aucune recommandation (jamais inventée).
 */
export function recommendedTemplates(list: TemplateCard[], limit = 10): TemplateCard[] {
  const liked = new Set(list.filter((t) => t.usedByMe).map((t) => t.category));
  if (liked.size === 0) return [];
  return list
    .filter((t) => !t.usedByMe && liked.has(t.category))
    .sort((a, b) => b.usesTotal - a.usesTotal || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

/** Chaîne lisible pour la recherche dans la bibliothèque. */
export function templateMatches(t: TemplateCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${t.title} ${t.description} ${t.subcategory} ${categoryLabel(t.category)}`.toLowerCase().includes(q);
}

/** Valide un modèle saisi par l'équipe avant l'envoi à la base (la base revérifie tout). */
export function validateTemplateDraft(input: {
  slug: string;
  title: string;
  description: string;
  subcategory: string;
  promptTemplate: string;
  fields: TemplateField[];
  creditCost: number;
  kind: TemplateKind;
  inputKind: TemplateInput;
  coverUrl: string;
}): string | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) || input.slug.length < 3 || input.slug.length > 60) {
    return "Identifiant invalide (lettres minuscules, chiffres et tirets, 3 à 60 caractères).";
  }
  if (input.title.trim().length < 3 || input.title.length > 80) return "Le titre doit faire 3 à 80 caractères.";
  if (input.description.trim().length < 5 || input.description.length > 400) return "La description doit faire 5 à 400 caractères.";
  if (input.subcategory.trim().length < 2 || input.subcategory.length > 40) return "Précisez un sous-type (2 à 40 caractères).";
  if (input.promptTemplate.trim().length < 10 || input.promptTemplate.length > TEMPLATE_PROMPT_MAX) {
    return "Les instructions IA doivent faire 10 à 1500 caractères.";
  }
  if (!Number.isInteger(input.creditCost) || input.creditCost < 0 || input.creditCost > 100) return "Le coût doit être un nombre entier de 0 à 100.";
  if (input.kind === "music" && input.inputKind === "photo") return "La musique ne prend pas de photo.";
  const missing = missingPlaceholders(input.promptTemplate, input.fields);
  if (missing.length) return `Les instructions utilisent {{${missing[0]}}} sans champ correspondant.`;
  if (input.coverUrl && !/^https:\/\//.test(input.coverUrl)) return "L'image de couverture doit être un lien https.";
  return null;
}

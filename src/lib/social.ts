import { normalizeWebsite } from "./prefs";

export const SOCIAL_NETWORKS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/votre.page" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/votrenom" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@votrenom" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@votrechaine" },
  { key: "x", label: "X", placeholder: "https://x.com/votrenom" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/votrenom" },
] as const;

export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];

/** Garde uniquement les réseaux connus avec une adresse web valide. */
export function cleanSocialLinks(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key } of SOCIAL_NETWORKS) {
    const raw = input[key];
    if (!raw) continue;
    const url = normalizeWebsite(raw);
    if (url) out[key] = url;
  }
  return out;
}

export function socialLabel(key: string): string {
  return SOCIAL_NETWORKS.find((n) => n.key === key)?.label ?? key;
}

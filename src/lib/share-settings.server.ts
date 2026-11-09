import { createPublicServerClient, signStoragePaths } from "./supabase-public.server";

export type ShareSettings = {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultImagePath: string | null;
  logoPath: string | null;
  showStats: boolean;
  twitterHandle: string | null;
  updatedAt: string | null;
};

export const DEFAULT_SHARE_SETTINGS: ShareSettings = {
  siteName: "PANU",
  defaultTitle: "PANU — Plateforme Africaine Numérique",
  defaultDescription: "Créez. Partagez. Apprenez. Achetez. Gagnez. Tout dans un seul espace.",
  defaultImagePath: null,
  logoPath: null,
  showStats: true,
  twitterHandle: null,
  updatedAt: null,
};

export async function readShareSettings(): Promise<ShareSettings> {
  try {
    const { data } = await createPublicServerClient().rpc("get_share_settings");
    const d = (data ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : null);
    return {
      siteName: str("site_name") ?? DEFAULT_SHARE_SETTINGS.siteName,
      defaultTitle: str("default_title") ?? DEFAULT_SHARE_SETTINGS.defaultTitle,
      defaultDescription: str("default_description") ?? DEFAULT_SHARE_SETTINGS.defaultDescription,
      defaultImagePath: str("default_image_path"),
      logoPath: str("logo_path"),
      showStats: d["show_stats"] !== false,
      twitterHandle: str("twitter_handle"),
      updatedAt: str("updated_at"),
    };
  } catch {
    return DEFAULT_SHARE_SETTINGS;
  }
}

/** Lien signé neuf pour une image de réglage (stockée sous <uid>/ dans « avatars »). */
export async function signSettingImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  const owner = path.split("/")[0];
  const m = await signStoragePaths("avatars", [{ path, ownerId: owner }], 600);
  return m.get(path) ?? null;
}

/** Sert une image distante telle quelle (les robots suivent mal les redirections). */
export async function proxyImage(url: string | null): Promise<Response> {
  if (!url) return new Response("Not found", { status: 404 });
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return new Response("Not found", { status: 404 });
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=300" },
  });
}

/** Image de repli : image par défaut choisie par l'équipe, sinon le logo. */
export async function fallbackShareImage(): Promise<string | null> {
  const s = await readShareSettings();
  return (await signSettingImage(s.defaultImagePath)) ?? (await signSettingImage(s.logoPath));
}

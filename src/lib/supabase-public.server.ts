import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";

function buildClient(userToken?: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuration du serveur incomplète.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      ...(userToken ? { headers: { Authorization: `Bearer ${userToken}` } } : {}),
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Client serveur avec la clé publiable (lectures publiques soumises aux règles d'accès). */
export function createPublicServerClient() {
  return buildClient();
}

/**
 * Client serveur qui agit au nom du visiteur s'il est connecté (jeton envoyé par le navigateur),
 * sinon comme un visiteur anonyme. Sert aux lectures publiques personnalisées
 * (« J'aime » du visiteur, fil des abonnements). Le jeton est vérifié par la base.
 */
export function createViewerServerClient() {
  const header = getRequestHeader("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  return buildClient(token && token !== key && token.split(".").length === 3 ? token : undefined);
}

/** Une URL signée doit être joignable par le navigateur, pas par l'adresse interne du serveur. */
export function toBrowserUrl(signedUrl: string): string {
  const url = process.env["SUPABASE_URL"] ?? "";
  const publicBase = process.env["VITE_SUPABASE_URL"] ?? url;
  return url ? signedUrl.replace(url, publicBase) : signedUrl;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

/**
 * Signe des chemins de stockage privés. À n'appeler qu'avec des chemins renvoyés par
 * les fonctions publiques de la base (contenus publiés), jamais avec une saisie du client.
 */
export async function signStoragePaths(
  bucket: "videos" | "avatars",
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(paths.filter((p): p is string => Boolean(p) && !p!.startsWith("http"))),
  ];
  const result = new Map<string, string>();
  for (const p of paths) if (p?.startsWith("http")) result.set(p, p);
  if (unique.length === 0) return result;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) console.error(error);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result.set(item.path, toBrowserUrl(item.signedUrl));
  }
  return result;
}

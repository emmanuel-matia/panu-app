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

/** Durée courte pour les stories : un abonné retiré perd vite l'accès aux médias. */
export const STORY_SIGNED_URL_TTL_SECONDS = 60 * 10;

export type OwnedPath = { path: string | null | undefined; ownerId: string | null | undefined };

/** Un chemin privé n'est signé que s'il se trouve dans le dossier `<ownerId>/` de son propriétaire. */
export function isOwnedPath(path: string, ownerId: string): boolean {
  return path.startsWith(`${ownerId}/`) && !path.includes("..");
}

/**
 * Signe des chemins de stockage privés. À n'appeler qu'avec des chemins renvoyés par
 * les fonctions publiques de la base (contenus publiés), jamais avec une saisie du client.
 * Chaque chemin doit appartenir au propriétaire indiqué, sinon il est ignoré.
 */
export async function signStoragePaths(
  bucket: "videos" | "avatars",
  items: OwnedPath[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      items
        .filter((i): i is { path: string; ownerId: string } =>
          Boolean(i.path && i.ownerId && isOwnedPath(i.path, i.ownerId)),
        )
        .map((i) => i.path),
    ),
  ];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrls(unique, ttlSeconds);
  if (error) console.error(error);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result.set(item.path, toBrowserUrl(item.signedUrl));
  }
  return result;
}

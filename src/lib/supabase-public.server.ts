import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Client serveur avec la clé publiable (lectures publiques soumises aux règles d'accès). */
export function createPublicServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuration du serveur incomplète.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
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

/** Une URL signée doit être joignable par le navigateur, pas par l'adresse interne du serveur. */
export function toBrowserUrl(signedUrl: string): string {
  const url = process.env["SUPABASE_URL"] ?? "";
  const publicBase = process.env["VITE_SUPABASE_URL"] ?? url;
  return url ? signedUrl.replace(url, publicBase) : signedUrl;
}

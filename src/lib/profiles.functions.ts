import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
};

const AVATAR_URL_TTL_SECONDS = 60 * 60 * 24;

/**
 * Lecture publique d'un profil par nom d'utilisateur (lisible sans connexion).
 * Renvoie null si le profil n'existe pas.
 */
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }): Promise<PublicProfile | null> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Configuration du serveur incomplète.");

    const client = createClient<Database>(url, key, {
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

    const username = data.username.toLowerCase().replace(/^@/, "");
    // Lecture via une fonction qui ne renvoie que les champs publics du profil.
    const { data: rows, error } = await client.rpc("get_public_profile", { _username: username });

    if (error) {
      console.error(error);
      throw new Error("Impossible de charger ce profil pour le moment.");
    }
    const row = rows?.[0];
    if (!row) return null;

    let avatarUrl: string | null = null;
    if (row.avatar_url) {
      if (row.avatar_url.startsWith("http")) {
        avatarUrl = row.avatar_url;
      } else {
        const signed = await client.storage
          .from("avatars")
          .createSignedUrl(row.avatar_url, AVATAR_URL_TTL_SECONDS);
        if (signed.error) console.error(signed.error);
        // L'URL doit être joignable par le navigateur, pas l'adresse interne du serveur.
        const publicBase = process.env["VITE_SUPABASE_URL"] ?? url;
        avatarUrl = signed.data?.signedUrl
          ? signed.data.signedUrl.replace(url, publicBase)
          : null;
      }
    }

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl,
      createdAt: row.created_at,
      followersCount: Number(row.followers_count ?? 0),
      followingCount: Number(row.following_count ?? 0),
    };
  });

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  website: string | null;
  city: string | null;
  country: string | null;
  social_links: Record<string, string>;
  birth_date: string | null;
  is_locked: boolean;
  is_professional: boolean;
  follow_policy: "everyone" | "nobody";
  searchable: boolean;
  show_online: boolean;
  deactivated_at: string | null;
};

export const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, cover_url, bio, location, created_at, website, city, country, social_links, birth_date, is_locked, is_professional, follow_policy, searchable, show_online, deactivated_at";

type ProfileRow = Omit<Profile, "social_links" | "follow_policy"> & {
  social_links: unknown;
  follow_policy: string;
};

function toProfile(row: ProfileRow): Profile {
  const links =
    row.social_links && typeof row.social_links === "object" && !Array.isArray(row.social_links)
      ? Object.fromEntries(
          Object.entries(row.social_links as Record<string, unknown>).filter(
            (e): e is [string, string] => typeof e[1] === "string",
          ),
        )
      : {};
  return {
    ...row,
    social_links: links,
    follow_policy: row.follow_policy === "nobody" ? "nobody" : "everyone",
  };
}

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data ? toProfile(data as ProfileRow) : null;
}

/**
 * Récupère le profil de l'utilisateur connecté. S'il n'existe pas encore
 * (première session après inscription), il est créé à partir du nom
 * d'utilisateur enregistré lors de l'inscription. Aucune donnée fictive.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const metadata = user.user_metadata as {
    username?: string;
    display_name?: string;
    full_name?: string;
  };

  const fallback = user.email?.split("@")[0] ?? user.id.slice(0, 8);
  const username = normalizeUsername(metadata.username ?? fallback) || `panu${user.id.slice(0, 6)}`;
  const displayName = metadata.display_name ?? metadata.full_name ?? username;

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username, display_name: displayName })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    // Nom d'utilisateur déjà pris : on réessaie avec un suffixe court.
    if (error.code === "23505" || error.code === "23514") {
      const retry = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: `${username}${user.id.slice(0, 4)}`,
          display_name: displayName,
        })
        .select(PROFILE_COLUMNS)
        .single();
      if (!retry.error && retry.data) return toProfile(retry.data as ProfileRow);
    }
    console.error(error);
    return null;
  }

  return data ? toProfile(data as ProfileRow) : null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_taken", { _username: username });

  if (error) {
    console.error(error);
    return true;
  }
  return !data;
}

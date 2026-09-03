import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data;
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
    .select("id, username, display_name, avatar_url, bio, created_at")
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
        .select("id, username, display_name, avatar_url, bio, created_at")
        .single();
      if (!retry.error) return retry.data;
    }
    console.error(error);
    return null;
  }

  return data;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("username", username);

  if (error) {
    console.error(error);
    return true;
  }
  return (count ?? 0) === 0;
}

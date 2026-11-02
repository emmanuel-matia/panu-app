import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { signStoragePaths } from "./supabase-public.server";

/**
 * Signe les avatars d'une liste de personnes (abonnés, recherche, suggestions).
 * Seuls les chemins qui sont réellement l'avatar d'un profil PANU sont signés.
 */
export const signAvatars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paths: z.array(z.string().min(1).max(300)).max(100) }).parse(input),
  )
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const unique = [...new Set(data.paths)];
    if (unique.length === 0) return {};
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .in("avatar_url", unique);
    if (error) {
      console.error(error);
      return {};
    }
    const allowed = (rows ?? []).map((r) => r.avatar_url);
    const signed = await signStoragePaths("avatars", allowed);
    return Object.fromEntries(signed);
  });

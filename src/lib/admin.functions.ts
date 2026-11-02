import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Supprime une publication au nom de la modération.
 * La base vérifie d'abord que l'appelant est administrateur ou fondateur (et protège le contenu du fondateur) ;
 * ce n'est qu'ensuite que les fichiers sont retirés du stockage.
 */
export const removePostAsStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ postId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: paths, error } = await context.supabase.rpc("admin_remove_post", {
      _post_id: data.postId,
      ...(data.reason ? { _reason: data.reason } : {}),
    });
    if (error) throw new Error(error.message);
    const files = paths as { media_path?: string | null; cover_path?: string | null } | null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targets = [files?.media_path, files?.cover_path].filter((p): p is string => Boolean(p));
    if (targets.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from("videos").remove(targets);
      if (removeError) console.error("Nettoyage du stockage impossible", removeError.message);
    }
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKETS = ["avatars", "videos", "ai-images", "ai-audio"] as const;

/**
 * Suppression définitive du compte de l'utilisateur connecté :
 * fichiers privés, puis compte (le reste des données est supprimé en cascade).
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("SUPPRIMER") }).parse(input))
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const bucket of BUCKETS) {
      // Les fichiers sont rangés sous `<user_id>/` : on les liste puis on les supprime par lots.
      for (let page = 0; page < 20; page++) {
        const { data: files, error } = await supabaseAdmin.storage
          .from(bucket)
          .list(userId, { limit: 100 });
        if (error) {
          console.error(error);
          break;
        }
        if (!files || files.length === 0) break;
        const { error: removeError } = await supabaseAdmin.storage
          .from(bucket)
          .remove(files.map((f) => `${userId}/${f.name}`));
        if (removeError) {
          console.error(removeError);
          break;
        }
        if (files.length < 100) break;
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(error);
      throw new Error("Impossible de supprimer le compte pour le moment. Réessayez plus tard.");
    }
    return { ok: true as const };
  });

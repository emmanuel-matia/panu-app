import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Bouton S'abonner / Abonné pour une ligne de liste (état local, écriture réelle en base). */
export function FollowToggle({ profileId, initial }: { profileId: string; initial: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user || busy) return;
    setBusy(true);
    const next = !following;
    const { error } = next
      ? await supabase.from("follows").insert({ follower_id: user.id, following_id: profileId })
      : await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
    setBusy(false);
    if (error && error.code !== "23505") {
      toast.error(
        error.message.includes("bloqu") || error.message.includes("autoris")
          ? "Vous ne pouvez pas suivre ce compte."
          : "Action impossible. Réessayez.",
      );
      return;
    }
    setFollowing(next);
    void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["follow-users"] });
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-xs font-semibold",
        following ? "border border-border text-muted-foreground" : "bg-brand text-primary-foreground",
      )}
    >
      {following ? "Abonné" : "S'abonner"}
    </button>
  );
}

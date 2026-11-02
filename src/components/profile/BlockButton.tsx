import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function relationKey(viewerId: string | undefined, profileId: string) {
  return ["relation", viewerId, profileId] as const;
}

/** Bloquer / débloquer un compte. Bloquer supprime les abonnements dans les deux sens. */
export function BlockButton({ profileId, username }: { profileId: string; username: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = relationKey(user?.id, profileId);
  const relation = useQuery({
    queryKey: key,
    enabled: Boolean(user) && user?.id !== profileId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("viewer_relation", { _profile_id: profileId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const mutation = useMutation({
    mutationFn: async (block: boolean) => {
      if (!user) throw new Error("Connexion requise.");
      if (block) {
        const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: profileId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", profileId);
        if (error) throw error;
      }
      return block;
    },
    onSuccess: async (block) => {
      toast.success(block ? `@${username} est bloqué` : `@${username} est débloqué`);
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ["is-following"] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => toast.error("Action impossible. Réessayez."),
  });

  if (!user || user.id === profileId || relation.isPending) return null;
  const blocked = Boolean(relation.data?.blocked_by_me);
  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => {
        if (!blocked && !window.confirm(`Bloquer @${username} ? Vous ne vous suivrez plus.`)) return;
        mutation.mutate(!blocked);
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
    >
      <Ban className="size-4" strokeWidth={1.75} />
      {blocked ? "Débloquer" : "Bloquer"}
    </button>
  );
}

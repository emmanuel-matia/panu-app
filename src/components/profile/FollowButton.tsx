import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { canFollow, nextFollowerCount } from "@/lib/profile-rules";
import type { PublicProfile } from "@/lib/profiles.functions";
import { cn } from "@/lib/utils";

export function publicProfileKey(username: string) {
  return ["public-profile", username.toLowerCase()] as const;
}

function isFollowingKey(viewerId: string | undefined, profileId: string) {
  return ["is-following", viewerId ?? "anon", profileId] as const;
}

export function FollowButton({ profileId, username }: { profileId: string; username: string }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const viewerId = user?.id;
  const allowed = canFollow(viewerId, profileId);

  const followingQuery = useQuery({
    queryKey: isFollowingKey(viewerId, profileId),
    enabled: allowed,
    queryFn: async () => {
      const { count, error: queryError } = await supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("follower_id", viewerId!)
        .eq("following_id", profileId);
      if (queryError) throw queryError;
      return (count ?? 0) > 0;
    },
  });

  const mutation = useMutation({
    mutationFn: async (wasFollowing: boolean) => {
      if (!viewerId) throw new Error("Connexion requise.");
      if (wasFollowing) {
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", profileId);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: profileId });
        // Déjà abonné (double clic) : l'état voulu est atteint.
        if (insertError && insertError.code !== "23505") throw insertError;
      }
    },
    onMutate: async (wasFollowing) => {
      setError(null);
      const followKey = isFollowingKey(viewerId, profileId);
      const profileKey = publicProfileKey(username);
      await queryClient.cancelQueries({ queryKey: followKey });
      const previousFollow = queryClient.getQueryData<boolean>(followKey);
      const previousProfile = queryClient.getQueryData<PublicProfile>(profileKey);
      queryClient.setQueryData(followKey, !wasFollowing);
      if (previousProfile) {
        queryClient.setQueryData<PublicProfile>(profileKey, {
          ...previousProfile,
          followersCount: nextFollowerCount(previousProfile.followersCount, wasFollowing),
        });
      }
      return { previousFollow, previousProfile };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(isFollowingKey(viewerId, profileId), context?.previousFollow);
      if (context?.previousProfile) {
        queryClient.setQueryData(publicProfileKey(username), context.previousProfile);
      }
      setError("L'action n'a pas pu être enregistrée. Réessayez.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: isFollowingKey(viewerId, profileId) });
      void queryClient.invalidateQueries({ queryKey: publicProfileKey(username) });
    },
  });

  if (loading) return null;

  if (!user) {
    return (
      <Link
        to="/connexion"
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <UserPlus className="size-4" strokeWidth={1.75} />
        Se connecter pour suivre
      </Link>
    );
  }

  if (!allowed) return null;

  const isFollowing = followingQuery.data === true;
  const busy = followingQuery.isPending || mutation.isPending;

  return (
    <div className="mt-5">
      <button
        type="button"
        aria-pressed={isFollowing}
        disabled={followingQuery.isPending}
        onClick={() => mutation.mutate(isFollowing)}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
          isFollowing
            ? "border border-border bg-surface text-surface-foreground hover:bg-muted"
            : "bg-brand text-primary-foreground hover:opacity-90",
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        ) : isFollowing ? (
          <UserCheck className="size-4" strokeWidth={1.75} />
        ) : (
          <UserPlus className="size-4" strokeWidth={1.75} />
        )}
        {isFollowing ? "Abonné · Ne plus suivre" : "Suivre"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

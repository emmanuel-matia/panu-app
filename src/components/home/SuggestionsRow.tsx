import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import { FollowToggle } from "@/components/profile/FollowToggle";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useSignedAvatars } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { suggestionLabel } from "@/lib/profile-rules";

/** « Suggestions pour vous » : vrais profils PANU (nouveaux, actifs, amis communs), jamais inventés. */
export function SuggestionsRow() {
  const { user } = useAuth();
  const [seed, setSeed] = useState(0);
  const query = useQuery({
    queryKey: ["home-suggestions", user?.id, seed],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("home_suggestions", { _seed: seed, _limit: 12 });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = query.data ?? [];
  const avatars = useSignedAvatars(rows);

  if (!user) return null;
  if (!query.isPending && rows.length === 0 && !query.isError) return null;

  return (
    <section aria-label="Suggestions pour vous" className="pb-3">
      <div className="mb-2 flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-foreground">Suggestions pour vous</h2>
        <div className="flex items-center gap-1">
          <Link
            to="/personnes"
            search={{ onglet: "decouvrir" }}
            aria-label="Rechercher des personnes"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <Search className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            aria-label="Actualiser les suggestions"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={query.isFetching ? "size-4 animate-spin" : "size-4"} />
          </button>
          <Link to="/personnes" search={{ onglet: "decouvrir" }} className="px-1 text-xs font-semibold text-accent">
            Voir tout
          </Link>
        </div>
      </div>
      {query.isError ? (
        <p role="alert" className="px-4 text-xs text-destructive">Suggestions indisponibles. Réessayez.</p>
      ) : query.isPending ? (
        <div className="flex gap-3 overflow-hidden px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 w-36 shrink-0 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : (
        <ul className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {rows.map((p) => (
            <li key={p.id} className="flex w-36 shrink-0 flex-col items-center rounded-2xl border border-border bg-card p-3 text-center">
              <Link to="/@{$username}" params={{ username: p.username }} className="flex min-w-0 flex-col items-center">
                <ProfileAvatar
                  url={p.avatar_url ? (avatars[p.avatar_url] ?? null) : null}
                  alt={`Avatar de ${p.display_name}`}
                  size="md"
                />
                <span className="mt-2 w-full truncate text-sm font-semibold text-foreground">{p.display_name}</span>
                <span className="w-full truncate text-xs text-muted-foreground">@{p.username}</span>
                <span className="mt-0.5 w-full truncate text-[0.625rem] text-accent">
                  {suggestionLabel(p.reason, Number(p.mutual_count))}
                </span>
              </Link>
              <div className="mt-2">
                <FollowToggle profileId={p.id} initial={false} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

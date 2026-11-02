import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, UserSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { FollowToggle } from "@/components/profile/FollowToggle";
import { PersonRow, useSignedAvatars, type Person } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Onglet = "abonnes" | "abonnements" | "decouvrir";

export const Route = createFileRoute("/_authenticated/personnes")({
  validateSearch: (search: Record<string, unknown>): { onglet: Onglet } => ({
    onglet: search["onglet"] === "abonnements" || search["onglet"] === "decouvrir" ? search["onglet"] : "abonnes",
  }),
  head: () => ({
    meta: [
      { title: "Abonnés et abonnements — PANU" },
      { name: "description", content: "Retrouvez vos abonnés, vos abonnements et de nouvelles personnes à suivre sur PANU." },
      { property: "og:title", content: "Abonnés et abonnements — PANU" },
      { property: "og:description", content: "Suivez des créateurs et gérez votre communauté." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PeoplePage,
});

const TABS: { id: Onglet; label: string }[] = [
  { id: "abonnes", label: "Abonnés" },
  { id: "abonnements", label: "Abonnements" },
  { id: "decouvrir", label: "Découvrir" },
];

type Row = Person & { i_follow: boolean; subtitle?: string };

function PeopleList({ rows, empty }: { rows: Row[]; empty: { title: string; description: string } }) {
  const avatars = useSignedAvatars(rows);
  if (rows.length === 0) return <EmptyState icon={UserSearch} title={empty.title} description={empty.description} />;
  return (
    <ul className="divide-y divide-border">
      {rows.map((p) => (
        <PersonRow
          key={p.id}
          person={p}
          avatarUrl={p.avatar_url ? (avatars[p.avatar_url] ?? null) : null}
          subtitle={p.subtitle}
          action={<FollowToggle profileId={p.id} initial={p.i_follow} />}
        />
      ))}
    </ul>
  );
}

function PeoplePage() {
  const { onglet } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const follows = useQuery({
    queryKey: ["follow-users", user?.id, onglet],
    enabled: Boolean(user) && onglet !== "decouvrir",
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("list_follow_users", {
        _kind: onglet === "abonnes" ? "followers" : "following",
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const search = useQuery({
    queryKey: ["search-profiles", debounced],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("search_profiles", { _q: debounced });
      if (error) throw error;
      return data ?? [];
    },
  });

  const suggestions = useQuery({
    queryKey: ["suggested-profiles", user?.id],
    enabled: Boolean(user) && onglet === "decouvrir" && debounced.length < 2,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("suggested_profiles");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        i_follow: false,
        subtitle: p.reason === "mutual" ? `${p.mutual_count} abonné(s) en commun` : "Suggestion",
      }));
    },
  });

  const searching = debounced.length >= 2;

  return (
    <AppShell
      title="Communauté"
      headerAction={
        <Link to="/profil" aria-label="Retour au profil" className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom ou @identifiant"
            aria-label="Rechercher une personne"
            className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-9 text-sm text-foreground"
          />
        </div>
        <div className="mt-3 flex gap-2 text-sm">
          <Link to="/amis" className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-surface-foreground">
            Retrouver mes amis
          </Link>
          <Link to="/inviter" className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-surface-foreground">
            Inviter
          </Link>
        </div>
      </div>

      {searching ? (
        <div className="mt-2">
          {search.isPending ? (
            <div className="m-4 h-20 animate-pulse rounded-2xl border border-border bg-surface" />
          ) : (
            <PeopleList
              rows={search.data ?? []}
              empty={{ title: "Aucun résultat", description: "Aucun compte ne correspond à cette recherche." }}
            />
          )}
        </div>
      ) : (
        <>
          <div role="tablist" className="mt-3 flex border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={onglet === t.id}
                onClick={() => void navigate({ to: "/personnes", search: { onglet: t.id }, replace: true })}
                className={cn(
                  "flex-1 border-b-2 py-2.5 text-sm font-medium",
                  onglet === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {onglet === "decouvrir" ? (
            suggestions.isPending ? (
              <div className="m-4 h-20 animate-pulse rounded-2xl border border-border bg-surface" />
            ) : (
              <PeopleList
                rows={suggestions.data ?? []}
                empty={{
                  title: "Pas de suggestion pour le moment",
                  description: "Les suggestions apparaissent selon vos abonnements. Cherchez un nom ou invitez vos amis.",
                }}
              />
            )
          ) : follows.isPending ? (
            <div className="m-4 h-20 animate-pulse rounded-2xl border border-border bg-surface" />
          ) : follows.isError ? (
            <p role="alert" className="p-4 text-sm text-destructive">Chargement impossible. Réessayez.</p>
          ) : (
            <PeopleList
              key={onglet}
              rows={follows.data ?? []}
              empty={
                onglet === "abonnes"
                  ? { title: "Aucun abonné pour le moment", description: "Partagez votre profil pour faire grandir votre communauté." }
                  : { title: "Aucun abonnement", description: "Utilisez la recherche ou l'onglet Découvrir pour suivre des créateurs." }
              }
            />
          )}
        </>
      )}
    </AppShell>
  );
}

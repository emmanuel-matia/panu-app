import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Coins, Eye, Heart, MessageCircle, Share2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isQuiet, parseCreatorStats, type CreatorStats } from "@/lib/creator-stats";
import { periodRange, type Period } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord créateur — PANU" },
      { name: "description", content: "Vos vues, abonnés, mentions J'aime et performances sur PANU." },
      { property: "og:title", content: "Tableau de bord créateur — PANU" },
      { property: "og:description", content: "Statistiques réelles de vos publications et stories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "custom", label: "Personnalisée" },
];

const nf = new Intl.NumberFormat("fr-FR");

function Kpi({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <Icon className="size-4 text-accent" strokeWidth={1.75} />
      <p className="mt-2 font-display text-xl font-semibold text-foreground">{nf.format(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Bars({ title, data, field }: { title: string; data: CreatorStats["daily"]; field: "views" | "followers" }) {
  const max = Math.max(1, ...data.map((d) => d[field]));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 flex h-24 items-end gap-0.5" role="img" aria-label={title}>
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day} : ${d[field]}`}
            className="min-h-0.5 flex-1 rounded-t bg-brand"
            style={{ height: `${Math.max(2, (d[field] / max) * 100)}%`, opacity: d[field] === 0 ? 0.25 : 1 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.625rem] text-muted-foreground">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = useMemo(
    () => periodRange(period, new Date(), { from, to }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, from, to],
  );

  const query = useQuery({
    queryKey: ["creator-stats", user?.id, range?.from.toISOString(), range?.to.toISOString()],
    enabled: Boolean(user && range),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("creator_stats", {
        _from: range!.from.toISOString(),
        _to: range!.to.toISOString(),
      });
      if (error) throw error;
      return parseCreatorStats(data);
    },
  });
  const s = query.data;

  return (
    <AppShell
      title="Tableau de bord"
      headerAction={
        <Link
          to="/profil"
          aria-label="Retour au profil"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-4 px-4 py-4">
        <div role="tablist" aria-label="Période" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
                period === p.id ? "border-transparent bg-brand text-primary-foreground" : "border-border text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Du
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">
              Au
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" />
            </label>
            {!range ? (
              <p className="col-span-2 text-xs text-muted-foreground">
                Choisissez deux dates (période d'un an maximum, début avant la fin).
              </p>
            ) : null}
          </div>
        ) : null}

        {query.isPending && range ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
        ) : query.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Impossible de charger vos statistiques. Réessayez dans un instant.
          </p>
        ) : s ? (
          <>
            {isQuiet(s) ? (
              <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                Aucune activité enregistrée sur cette période. Les chiffres s'afficheront dès que vos contenus seront vus, aimés ou commentés.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Kpi icon={Eye} label="Vues" value={s.views} />
              <Kpi icon={Users} label="Portée (personnes distinctes)" value={s.reach} />
              <Kpi icon={Users} label="Abonnés au total" value={s.followersTotal} />
              <Kpi icon={Users} label="Nouveaux abonnés" value={s.followersGained} />
              <Kpi icon={Heart} label="Mentions J'aime" value={s.likes} />
              <Kpi icon={MessageCircle} label="Commentaires" value={s.comments} />
              <Kpi icon={Share2} label="Partages" value={s.shares} />
              <Kpi icon={BarChart3} label="Vues des vidéos" value={s.videoViews} />
            </div>

            {s.daily.length > 1 ? (
              <>
                <Bars title="Vues par jour" data={s.daily} field="views" />
                <Bars title="Évolution des abonnés (nouveaux par jour)" data={s.daily} field="followers" />
              </>
            ) : null}

            <section className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-foreground">Publications les plus consultées</h3>
              {s.topPosts.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Aucune publication consultée sur cette période.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {s.topPosts.map((p, i) => (
                    <li key={p.id}>
                      <Link to="/p/$postId" params={{ postId: p.id }} className="flex items-start gap-3">
                        <span className="font-display text-sm text-muted-foreground">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{p.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {nf.format(p.views)} vues · {nf.format(p.likes)} J'aime · {nf.format(p.comments)} commentaires · {nf.format(p.shares)} partages
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-foreground">Publications et stories</h3>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Publications au total</dt><dd className="text-foreground">{nf.format(s.postsTotal)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Publiées sur la période</dt><dd className="text-foreground">{nf.format(s.postsInPeriod)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Stories créées</dt><dd className="text-foreground">{nf.format(s.storiesCount)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Vues des stories</dt><dd className="text-foreground">{nf.format(s.storyViews)}</dd></div>
              </dl>
            </section>

            <section className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
              <Coins className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revenus et cadeaux</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  La monétisation n'est pas encore disponible sur PANU : aucun revenu ni cadeau n'est affiché. Cette section s'activera avec les paiements.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

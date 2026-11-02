import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Loader2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { useStepUp } from "@/components/security/StepUp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { auditLabel, reasonLabel, type StaffRole } from "@/lib/admin-rules";
import { removePostAsStaff } from "@/lib/admin.functions";
import { PLAN_LABELS, type Plan } from "@/lib/credits";
import { isStepUpRequiredError } from "@/lib/passkey-rules";

const card = "rounded-2xl border border-border bg-surface p-4";
const btn = "inline-flex h-9 items-center justify-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-surface-foreground hover:bg-muted disabled:opacity-50";
const dateFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

function Loading() {
  return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={card}>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

type Overview = Record<string, unknown> & {
  users_total: number; users_7d: number; users_30d: number; users_active_7d: number;
  posts_total: number; posts_7d: number; posts_by_kind: Record<string, number>; stories_active: number;
  comments_total: number; likes_total: number; views_total: number; ai_creations_total: number;
  reports_open: number; reports_total: number;
  admins_count?: number; plans?: Record<string, number>; ai_credits_spent?: number;
};

export function OverviewPanel({ role }: { role: StaffRole }) {
  const q = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  if (q.isPending) return <Loading />;
  if (q.isError || !q.data) return <p className="p-4 text-sm text-destructive">Statistiques indisponibles.</p>;
  const o = q.data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Comptes" value={o.users_total} />
        <Stat label="Nouveaux (7 jours)" value={o.users_7d} />
        <Stat label="Nouveaux (30 jours)" value={o.users_30d} />
        <Stat label="Actifs (7 jours)" value={o.users_active_7d} />
        <Stat label="Publications" value={o.posts_total} />
        <Stat label="Publications (7 jours)" value={o.posts_7d} />
        <Stat label="Stories actives" value={o.stories_active} />
        <Stat label="Vues" value={o.views_total} />
        <Stat label="J'aime" value={o.likes_total} />
        <Stat label="Commentaires" value={o.comments_total} />
        <Stat label="Créations IA" value={o.ai_creations_total} />
        <Stat label="Signalements en attente" value={o.reports_open} />
      </div>
      {Object.keys(o.posts_by_kind).length > 0 ? (
        <div className={card}>
          <p className="text-sm font-semibold text-foreground">Publications par type</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {Object.entries(o.posts_by_kind).map(([k, c]) => `${k} : ${c}`).join(" · ")}
          </p>
        </div>
      ) : null}
      {role === "founder" ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Administrateurs" value={o.admins_count ?? 0} />
          <Stat label="Crédits IA dépensés" value={o.ai_credits_spent ?? 0} />
          {(["free", "premium", "pro"] as Plan[]).map((p) => (
            <Stat key={p} label={`Offre ${PLAN_LABELS[p]}`} value={o.plans?.[p] ?? 0} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type UserRow = {
  id: string; username: string; display_name: string; created_at: string; last_seen_at: string | null;
  deactivated_at: string | null; plan: string; role: string; posts_count: number; followers_count: number;
  reports_against: number; email: string | null;
};

const ROLE_LABEL: Record<string, string> = { founder: "Fondateur", admin: "Administrateur", user: "Membre" };

export function UsersPanel({ role }: { role: StaffRole }) {
  const [term, setTerm] = useState("");
  const [applied, setApplied] = useState("");
  const q = useQuery({
    queryKey: ["admin", "users", applied],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { ...(applied ? { _q: applied } : {}), _limit: 50, _offset: 0 });
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); setApplied(term.trim()); }} className="flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          type="search"
          aria-label="Rechercher un utilisateur"
          placeholder={role === "founder" ? "Nom, identifiant ou e-mail" : "Nom ou identifiant"}
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground"
        />
        <button type="submit" className={btn}>Chercher</button>
      </form>
      {q.isPending ? <Loading /> : (q.data ?? []).length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {(q.data ?? []).map((u) => (
            <li key={u.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <Link to="/@{$username}" params={{ username: u.username }} className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {u.display_name} <span className="font-normal text-muted-foreground">@{u.username}</span>
                </Link>
                <span className={u.role === "founder" ? "rounded-full bg-gold px-2 py-0.5 text-[0.625rem] font-bold text-gold-foreground" : u.role === "admin" ? "rounded-full bg-accent px-2 py-0.5 text-[0.625rem] font-bold text-accent-foreground" : "text-[0.625rem] text-muted-foreground"}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </div>
              {u.email ? <p className="truncate text-xs text-muted-foreground">{u.email}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Offre {PLAN_LABELS[u.plan as Plan] ?? u.plan} · {u.posts_count} publication(s) · {u.followers_count} abonné(s) · inscrit le {dateFmt(u.created_at)}
                {u.deactivated_at ? " · compte désactivé" : ""}
                {u.reports_against > 0 ? ` · ${u.reports_against} signalement(s)` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ReportRow = {
  id: string; status: string; reason: string; details: string | null; created_at: string; post_id: string | null;
  post_title: string | null; post_kind: string | null; reporter_username: string | null; target_user_id: string | null;
  target_username: string | null; handled_by_username: string | null; handled_at: string | null; resolution_note: string | null;
};

export function ReportsPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"open" | "all">("open");
  const remove = useServerFn(removePostAsStaff);
  const q = useQuery({
    queryKey: ["admin", "reports", status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_reports", { _status: status });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  };
  const resolve = useMutation({
    mutationFn: async (v: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase.rpc("admin_resolve_report", { _id: v.id, _status: v.status });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Signalement mis à jour"); await refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removePost = useMutation({
    mutationFn: async (postId: string) => remove({ data: { postId, reason: "Signalement confirmé" } }),
    onSuccess: async () => { toast.success("Publication supprimée"); await refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["open", "all"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={`${btn} ${status === s ? "bg-muted" : ""}`}>
            {s === "open" ? "En attente" : "Tous"}
          </button>
        ))}
      </div>
      {q.isPending ? <Loading /> : (q.data ?? []).length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucun signalement" description="Les signalements des membres apparaîtront ici." />
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((r) => (
            <li key={r.id} className={card}>
              <p className="text-sm font-semibold text-foreground">{r.post_title ?? "Publication supprimée"}</p>
              <p className="text-xs text-muted-foreground">
                {reasonLabel(r.reason)} · signalé par @{r.reporter_username ?? "?"}
                {r.target_username ? ` · auteur @${r.target_username}` : ""} · {dateFmt(r.created_at)}
              </p>
              {r.details ? <p className="mt-1 text-sm text-surface-foreground">« {r.details} »</p> : null}
              {r.status !== "open" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.status === "resolved" ? "Traité" : "Rejeté"} par @{r.handled_by_username ?? "?"} le {dateFmt(r.handled_at)}
                  {r.resolution_note ? ` — ${r.resolution_note}` : ""}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.post_id ? (
                    <Link to="/p/$postId" params={{ postId: r.post_id }} className={btn}>Voir</Link>
                  ) : null}
                  {r.post_id ? (
                    <button type="button" disabled={removePost.isPending} className={`${btn} text-destructive`}
                      onClick={() => { if (window.confirm("Supprimer cette publication ?")) removePost.mutate(r.post_id!); }}>
                      Supprimer la publication
                    </button>
                  ) : null}
                  <button type="button" disabled={resolve.isPending} className={btn} onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}>Marquer traité</button>
                  <button type="button" disabled={resolve.isPending} className={btn} onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}>Rejeter</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type AdminRow = { id: string; username: string; display_name: string; role: string; email: string | null };

export function AdminsPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [term, setTerm] = useState("");
  const [applied, setApplied] = useState("");
  const stepUp = useStepUp();
  const admins = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_admins");
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });
  const found = useQuery({
    queryKey: ["admin", "users", "pick", applied],
    enabled: applied.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _q: applied, _limit: 8, _offset: 0 });
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });
  const setAdmin = useMutation({
    mutationFn: async (v: { id: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_admin", { _target: v.id, _grant: v.grant });
      if (error) throw error;
    },
    onSuccess: async (_d, v) => {
      toast.success(v.grant ? "Rôle administrateur accordé" : "Rôle administrateur retiré");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error, v) => {
      if (isStepUpRequiredError(e.message)) stepUp.request(() => setAdmin.mutate(v));
      else toast.error(e.message);
    },
  });
  return (
    <div className="space-y-4">
      {stepUp.dialog}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Équipe actuelle</h2>
        {admins.isPending ? <Loading /> : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {(admins.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{a.display_name} <span className="font-normal text-muted-foreground">@{a.username}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{a.email ?? ""}</span>
                </span>
                {a.role === "founder" ? (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[0.625rem] font-bold text-gold-foreground">Fondateur · protégé</span>
                ) : (
                  <button type="button" disabled={setAdmin.isPending} className={`${btn} text-destructive`} onClick={() => { if (window.confirm(`Retirer le rôle administrateur à @${a.username} ?`)) setAdmin.mutate({ id: a.id, grant: false }); }}>
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Nommer un administrateur</h2>
        <form onSubmit={(e) => { e.preventDefault(); setApplied(term.trim()); }} className="flex gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} type="search" aria-label="Chercher un compte" placeholder="Nom, identifiant ou e-mail" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground" />
          <button type="submit" className={btn}>Chercher</button>
        </form>
        {(found.data ?? []).map((u) => (
          <div key={u.id} className={`${card} flex items-center justify-between gap-2`}>
            <span className="min-w-0 truncate text-sm text-foreground">{u.display_name} <span className="text-muted-foreground">@{u.username}</span></span>
            {u.role === "user" && u.id !== user?.id ? (
              <button type="button" disabled={setAdmin.isPending} className={btn} onClick={() => setAdmin.mutate({ id: u.id, grant: true })}>Nommer admin</button>
            ) : <span className="text-xs text-muted-foreground">{ROLE_LABEL[u.role]}</span>}
          </div>
        ))}
      </section>
    </div>
  );
}

export function PlansPanel() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [applied, setApplied] = useState("");
  const stepUp = useStepUp();
  const found = useQuery({
    queryKey: ["admin", "users", "plans", applied],
    enabled: applied.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _q: applied, _limit: 8, _offset: 0 });
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });
  const setPlan = useMutation({
    mutationFn: async (v: { id: string; plan: Plan }) => {
      const { error } = await supabase.rpc("admin_set_plan", { _target: v.id, _plan: v.plan });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Offre mise à jour"); await queryClient.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error, v) => {
      if (isStepUpRequiredError(e.message)) stepUp.request(() => setPlan.mutate(v));
      else toast.error(e.message);
    },
  });
  return (
    <div className="space-y-3">
      {stepUp.dialog}
      <p className="text-sm text-muted-foreground">Change l'offre affichée et appliquée au compte. Aucun paiement n'est créé ni modifié.</p>
      <form onSubmit={(e) => { e.preventDefault(); setApplied(term.trim()); }} className="flex gap-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} type="search" aria-label="Chercher un compte" placeholder="Nom, identifiant ou e-mail" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground" />
        <button type="submit" className={btn}>Chercher</button>
      </form>
      {(found.data ?? []).map((u) => (
        <div key={u.id} className={card}>
          <p className="text-sm font-semibold text-foreground">{u.display_name} <span className="font-normal text-muted-foreground">@{u.username}</span></p>
          <div className="mt-2 flex gap-2">
            {(["free", "premium", "pro"] as Plan[]).map((p) => (
              <button key={p} type="button" aria-pressed={u.plan === p} disabled={setPlan.isPending || u.plan === p} onClick={() => setPlan.mutate({ id: u.id, plan: p })} className={`${btn} ${u.plan === p ? "bg-muted" : ""}`}>
                {PLAN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type AuditRow = { id: string; action: string; actor_username: string | null; target_username: string | null; details: Record<string, unknown>; created_at: string };

export function AuditPanel() {
  const q = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_audit", { _limit: 50 });
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
  if (q.isPending) return <Loading />;
  if ((q.data ?? []).length === 0) return <EmptyState icon={ShieldCheck} title="Journal vide" description="Chaque action de l'équipe sera enregistrée ici." />;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {(q.data ?? []).map((a) => (
        <li key={a.id} className="px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{auditLabel(a.action)}</p>
          <p className="text-xs text-muted-foreground">
            par @{a.actor_username ?? "?"}{a.target_username ? ` · concerne @${a.target_username}` : ""} · {dateFmt(a.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MonetizationPanel() {
  return (
    <EmptyState
      icon={Banknote}
      title="Monétisation non activée"
      description="Aucun système de paiement n'est branché sur PANU pour l'instant : aucun revenu ni solde n'est affiché. Cette rubrique sera alimentée après votre accord."
    />
  );
}

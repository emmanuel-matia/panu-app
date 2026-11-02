import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, LogOut, MessageCircle, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { canDeleteAccount, MIN_PASSWORD_LENGTH, validateNewPassword } from "@/lib/account-rules";
import { nativeShare, shareUrl } from "@/lib/invite";
import { referralLink } from "@/lib/prefs";

import { Card, inputClass, Note } from "./controls";

export function Unavailable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 text-muted-foreground" /> {title}
      </h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </Card>
  );
}

function useSignOutLocally() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async (scope: "local" | "others" | "global" = "local") => {
    if (scope === "others") {
      await supabase.auth.signOut({ scope: "others" });
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope });
    void navigate({ to: "/connexion", replace: true });
  };
}

export function AccountSection() {
  const { user, profile, refreshProfile } = useAuth();
  const signOut = useSignOutLocally();
  const deleteAccount = useServerFn(deleteMyAccount);

  const [birth, setBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (profile) setBirth(profile.birth_date ?? "");
  }, [profile]);

  async function saveBirth() {
    if (!user) return;
    setBusy("birth");
    const { error } = await supabase.from("profiles").update({ birth_date: birth || null }).eq("id", user.id);
    setBusy(null);
    if (error) toast.error("Date de naissance invalide.");
    else {
      toast.success("Date de naissance enregistrée");
      await refreshProfile();
    }
  }

  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/connexion` });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Un e-mail de confirmation vous a été envoyé.");
      setEmail("");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    const problem = validateNewPassword(password, confirmation);
    setPasswordError(problem);
    if (problem) return;
    setBusy("password");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setConfirmation("");
    toast.success("Mot de passe modifié");
  }

  async function exportData() {
    if (!user) return;
    setBusy("export");
    try {
      const uid = user.id;
      const tables = [
        ["profil", supabase.from("profiles").select("*").eq("id", uid)],
        ["reglages", supabase.from("user_settings").select("*").eq("user_id", uid)],
        ["publications", supabase.from("posts").select("*").eq("author_id", uid)],
        ["stories", supabase.from("stories").select("*").eq("author_id", uid)],
        ["commentaires", supabase.from("post_comments").select("*").eq("author_id", uid)],
        ["j_aime", supabase.from("post_likes").select("*").eq("user_id", uid)],
        ["enregistrements", supabase.from("post_saves").select("*").eq("user_id", uid)],
        ["abonnements_donnes", supabase.from("follows").select("*").eq("follower_id", uid)],
        ["abonnes", supabase.from("follows").select("*").eq("following_id", uid)],
        ["comptes_bloques", supabase.from("blocks").select("*").eq("blocker_id", uid)],
        ["creations_ia", supabase.from("ai_creations").select("*").eq("user_id", uid)],
        ["mouvements_credits", supabase.from("credit_transactions").select("*").eq("user_id", uid)],
        ["credits", supabase.from("user_credits").select("*").eq("user_id", uid)],
        ["temps_utilisation", supabase.from("usage_daily").select("*").eq("user_id", uid)],
        ["telephone", supabase.from("phone_lookup").select("phone, discoverable").eq("user_id", uid)],
      ] as const;
      const results = await Promise.all(tables.map(([, q]) => q));
      const out: Record<string, unknown> = {
        genere_le: new Date().toISOString(),
        compte: { id: uid, email: user.email, cree_le: user.created_at },
      };
      tables.forEach(([name], i) => {
        out[name] = results[i]?.data ?? [];
      });
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `panu-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vos données ont été téléchargées");
    } catch {
      toast.error("Téléchargement impossible. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  async function deactivate() {
    if (!user) return;
    if (!window.confirm("Désactiver temporairement votre compte ? Votre profil et vos publications seront masqués. Vous le réactivez en vous reconnectant.")) return;
    setBusy("deactivate");
    const { error } = await supabase.from("profiles").update({ deactivated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) {
      setBusy(null);
      toast.error("Désactivation impossible.");
      return;
    }
    await signOut();
  }

  async function remove() {
    if (!canDeleteAccount(typed)) return;
    setBusy("delete");
    try {
      await deleteAccount({ data: { confirm: "SUPPRIMER" } });
      await signOut();
    } catch (error) {
      setBusy(null);
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  const providers = (user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("fr-FR") : "—";

  return (
    <>
      <Card title="Informations personnelles">
        <dl className="space-y-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Nom affiché</dt><dd className="text-surface-foreground">{profile?.display_name ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Nom d'utilisateur</dt><dd className="text-surface-foreground">{profile ? `@${profile.username}` : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Adresse e-mail</dt><dd className="text-surface-foreground">{user?.email ?? "—"}</dd></div>
        </dl>
        <Link to="/profil/modifier" className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold text-surface-foreground hover:bg-muted">
          Modifier nom, photo de profil et couverture
        </Link>
        <div className="space-y-2">
          <label htmlFor="birth" className="text-sm text-surface-foreground">Date de naissance (facultative, jamais affichée)</label>
          <div className="flex gap-2">
            <input id="birth" type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} className={inputClass} />
            <ActionButton type="button" disabled={busy === "birth"} onClick={() => void saveBirth()}>OK</ActionButton>
          </div>
        </div>
        <form onSubmit={changeEmail} className="space-y-2">
          <label htmlFor="new-email" className="text-sm text-surface-foreground">Changer d'adresse e-mail</label>
          <div className="flex gap-2">
            <input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nouvelle@adresse.com" className={inputClass} />
            <ActionButton type="submit" disabled={busy === "email" || !email}>Envoyer</ActionButton>
          </div>
          <Note>Un lien de confirmation est envoyé : l'adresse ne change qu'après confirmation.</Note>
        </form>
        <div className="space-y-1">
          <p className="text-sm text-surface-foreground">Numéro de téléphone</p>
          <Link to="/amis" className="text-sm font-medium text-accent underline">Gérer mon numéro (privé)</Link>
        </div>
      </Card>

      <Card title="Mot de passe">
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" autoComplete="new-password" placeholder={`Nouveau mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum)`} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} aria-label="Nouveau mot de passe" />
          <input type="password" autoComplete="new-password" placeholder="Confirmer le mot de passe" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} aria-label="Confirmer le mot de passe" />
          {passwordError ? <p role="alert" className="text-xs text-destructive">{passwordError}</p> : null}
          <ActionButton type="submit" disabled={busy === "password" || !password}>{busy === "password" ? "Enregistrement…" : "Changer le mot de passe"}</ActionButton>
        </form>
      </Card>

      <Card title="Sécurité et connexions">
        <dl className="space-y-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">Dernière connexion</dt><dd className="text-surface-foreground">{lastSignIn}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Méthodes de connexion</dt><dd className="text-surface-foreground">{providers.length ? providers.map((p) => (p === "email" ? "E-mail et mot de passe" : p === "google" ? "Google" : p)).join(", ") : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Appareil actuel</dt><dd className="break-words text-surface-foreground">{typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "—"}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void signOut("others").then(() => toast.success("Les autres appareils sont déconnectés"))} className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-surface-foreground">
            Déconnecter les autres appareils
          </button>
          <button type="button" onClick={() => void signOut("global")} className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-surface-foreground">
            Se déconnecter partout
          </button>
        </div>
        <Note>La liste détaillée des appareils connectés, l'authentification à deux facteurs et les alertes de sécurité ne sont pas encore disponibles.</Note>
      </Card>

      <Card title="Gestion du compte">
        <dl className="space-y-1 text-sm">
          <div><dt className="text-xs text-muted-foreground">Compte créé le</dt><dd className="text-surface-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}</dd></div>
        </dl>
        <button type="button" disabled={busy === "export"} onClick={() => void exportData()} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-surface-foreground">
          <Download className="size-4" /> {busy === "export" ? "Préparation…" : "Télécharger mes données"}
        </button>
        <button type="button" disabled={busy === "deactivate"} onClick={() => void deactivate()} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-surface-foreground">
          Désactiver temporairement mon compte
        </button>
        <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-surface-foreground">
          <LogOut className="size-4" /> Se déconnecter
        </button>
      </Card>

      <Card title="Supprimer définitivement mon compte">
        <Note>Action irréversible : profil, publications, stories, créations IA et crédits sont supprimés. Tapez {`« SUPPRIMER »`} pour confirmer.</Note>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="SUPPRIMER" aria-label="Confirmation de suppression" className={inputClass} />
        <button type="button" disabled={!canDeleteAccount(typed) || busy === "delete"} onClick={() => void remove()} className="h-11 w-full rounded-full bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50">
          {busy === "delete" ? "Suppression…" : "Supprimer mon compte"}
        </button>
      </Card>
    </>
  );
}

export function SubscriptionsSection() {
  const { user } = useAuth();
  const credits = useQuery({
    queryKey: ["credits-detail", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [c, t] = await Promise.all([
        supabase.from("user_credits").select("plan, balance, welcome_granted_at").eq("user_id", user!.id).maybeSingle(),
        supabase.from("credit_transactions").select("id, amount, reason, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(30),
      ]);
      if (c.error) throw c.error;
      return { plan: c.data?.plan ?? "free", balance: c.data?.balance ?? 0, welcome: c.data?.welcome_granted_at ?? null, tx: t.data ?? [] };
    },
  });
  const d = credits.data;
  const plan = d?.plan ?? "free";
  return (
    <>
      <Card title="Offre actuelle">
        <p className="font-display text-2xl font-bold text-foreground">{plan === "free" ? "Free" : plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : plan}</p>
        <p className="text-sm text-muted-foreground">Crédits disponibles : <strong className="text-foreground">{credits.isPending ? "…" : (d?.balance ?? 0)}</strong></p>
        <Note>Les crédits servent aux créations du Studio IA (texte, image, voix, musique, vidéo).</Note>
      </Card>
      <Card title="Les offres PANU">
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Free {plan === "free" ? "· offre actuelle" : ""}</p>
            <p className="text-xs text-muted-foreground">Accès à PANU, 60 crédits offerts à l'inscription pour le Studio IA.</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Premium</p>
            <p className="text-xs text-muted-foreground">Pas encore disponible : avantages et tarifs publiés à l'ouverture.</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Pro</p>
            <p className="text-xs text-muted-foreground">Pas encore disponible : avantages et tarifs publiés à l'ouverture.</p>
          </div>
        </div>
        <Note>Aucun système de paiement n'est actif : aucune souscription, renouvellement ni résiliation n'est possible pour l'instant.</Note>
      </Card>
      <Card title="Historique des crédits">
        {d && d.tx.length > 0 ? (
          <ul className="divide-y divide-border">
            {d.tx.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-surface-foreground">{t.reason}<span className="block text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")}</span></span>
                <span className={t.amount >= 0 ? "text-accent" : "text-muted-foreground"}>{t.amount > 0 ? `+${t.amount}` : t.amount}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Note>Aucun mouvement de crédits.</Note>
        )}
      </Card>
      <Card title="Historique des abonnements et des paiements">
        <Note>Aucun abonnement payant ni paiement enregistré.</Note>
      </Card>
    </>
  );
}

export function PaymentsSection() {
  return (
    <>
      <Unavailable title="Paiement des publicités">
        Les publicités et les moyens de paiement ne sont pas encore ouverts sur PANU. Aucune dépense, facture ni historique n'existe : rien n'est affiché pour ne pas inventer de montants.
      </Unavailable>
      <Unavailable title="Règlements">
        La monétisation des créateurs (revenus, cadeaux, retraits) n'est pas encore active. Quand elle le sera, vos revenus, transactions et informations de règlement apparaîtront ici.
      </Unavailable>
      <Card>
        <Link to="/parametres/$section" params={{ section: "abonnements" }} className="text-sm font-medium text-accent underline">Voir mes crédits et mon offre</Link>
      </Card>
    </>
  );
}

export function HistorySection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"posts" | "comments" | "likes" | "follows" | "invites">("posts");
  const q = useQuery({
    queryKey: ["history", user?.id, tab],
    enabled: Boolean(user),
    queryFn: async () => {
      const uid = user!.id;
      if (tab === "posts") {
        const { data } = await supabase.from("posts").select("id, title, created_at, kind").eq("author_id", uid).order("created_at", { ascending: false }).limit(50);
        return (data ?? []).map((r) => ({ id: r.id, label: r.title, date: r.created_at, link: r.id }));
      }
      if (tab === "comments") {
        const { data } = await supabase.from("post_comments").select("id, body, created_at, post_id").eq("author_id", uid).order("created_at", { ascending: false }).limit(50);
        return (data ?? []).map((r) => ({ id: r.id, label: r.body, date: r.created_at, link: r.post_id }));
      }
      if (tab === "likes") {
        const { data } = await supabase.from("post_likes").select("post_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
        return (data ?? []).map((r) => ({ id: r.post_id, label: "J'aime sur une publication", date: r.created_at, link: r.post_id }));
      }
      if (tab === "follows") {
        const { data } = await supabase.rpc("list_follow_users", { _kind: "following" });
        return (data ?? []).map((r) => ({ id: r.id, label: `Abonné à @${r.username}`, date: r.followed_at, link: null as string | null }));
      }
      const { data } = await supabase.rpc("list_my_referrals");
      return (data ?? []).map((r) => ({ id: r.id, label: `@${r.username} s'est inscrit avec votre invitation`, date: r.created_at, link: null as string | null }));
    },
  });

  async function remove(id: string) {
    if (!user) return;
    const { error } =
      tab === "comments"
        ? await supabase.from("post_comments").delete().eq("id", id)
        : tab === "likes"
          ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id)
          : tab === "follows"
            ? await supabase.from("follows").delete().eq("following_id", id).eq("follower_id", user.id)
            : { error: new Error("non supprimable") };
    if (error) toast.error("Suppression impossible.");
    else {
      toast.success("Élément supprimé");
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  }

  const tabs = [
    ["posts", "Publications"],
    ["comments", "Commentaires"],
    ["likes", "Réactions"],
    ["follows", "Abonnements"],
    ["invites", "Invitations"],
  ] as const;
  const rows = q.data ?? [];
  return (
    <>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${tab === id ? "border-transparent bg-brand text-primary-foreground" : "border-border text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        {q.isPending ? (
          <div className="h-16 animate-pulse" />
        ) : rows.length === 0 ? (
          <Note>Rien à afficher ici pour le moment.</Note>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-surface-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleString("fr-FR")}</span>
                </span>
                {r.link ? <Link to="/p/$postId" params={{ postId: r.link }} className="text-xs font-semibold text-accent">Voir</Link> : null}
                {tab !== "posts" && tab !== "invites" ? (
                  <button type="button" onClick={() => void remove(r.id)} className="text-xs font-semibold text-destructive">Supprimer</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Note>
          {tab === "posts" ? "Pour modifier ou supprimer une publication, ouvrez-la depuis votre profil. " : ""}
          Les recherches ne sont pas enregistrées par PANU.
        </Note>
      </Card>
    </>
  );
}

type PermState = "granted" | "denied" | "prompt" | "unsupported";

export function DevicePermissions() {
  const [state, setState] = useState<Record<string, PermState>>({});
  async function refresh() {
    const names = ["camera", "microphone", "notifications", "geolocation"] as const;
    const next: Record<string, PermState> = {};
    for (const n of names) {
      try {
        const r = await navigator.permissions.query({ name: n as PermissionName });
        next[n] = r.state as PermState;
      } catch {
        next[n] = "unsupported";
      }
    }
    setState(next);
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function ask(name: string) {
    try {
      if (name === "camera" || name === "microphone") {
        const stream = await navigator.mediaDevices.getUserMedia(name === "camera" ? { video: true } : { audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } else if (name === "notifications") {
        await Notification.requestPermission();
      } else if (name === "geolocation") {
        await new Promise<void>((res, rej) => navigator.geolocation.getCurrentPosition(() => res(), rej));
      }
    } catch {
      toast.error("L'autorisation n'a pas été accordée.");
    }
    await refresh();
  }

  const LABEL: Record<PermState, string> = { granted: "Autorisée", denied: "Refusée", prompt: "Pas encore demandée", unsupported: "Non disponible" };
  const rows: [string, string, string][] = [
    ["camera", "Caméra", "Pour filmer une vidéo ou une story."],
    ["microphone", "Microphone", "Pour enregistrer le son."],
    ["notifications", "Notifications", "Les notifications push ne sont pas encore proposées par PANU."],
    ["geolocation", "Localisation", "PANU n'utilise pas votre position aujourd'hui."],
  ];
  return (
    <>
      <Card>
        <ul className="divide-y divide-border">
          {rows.map(([id, label, hint]) => (
            <li key={id} className="flex items-center gap-3 py-3">
              <span className="flex-1">
                <span className="block text-sm text-surface-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
                <span className="block text-xs font-medium text-foreground">{LABEL[state[id] ?? "unsupported"]}</span>
              </span>
              {state[id] === "prompt" ? (
                <button type="button" onClick={() => void ask(id)} className="h-9 rounded-full border border-border px-4 text-xs font-semibold text-surface-foreground">Autoriser</button>
              ) : null}
            </li>
          ))}
        </ul>
        <Note>Pour retirer une autorisation accordée, utilisez les réglages du site dans votre navigateur ou de l'application sur votre téléphone.</Note>
      </Card>
      <Card title="Galerie, vidéos et contacts">
        <Note>PANU n'a jamais d'accès permanent à vos photos, vidéos ou contacts : vous les choisissez vous-même, un par un, au moment de publier ou de retrouver vos amis.</Note>
      </Card>
    </>
  );
}

export function AppsSection() {
  const { user } = useAuth();
  const providers = (user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
  return (
    <Card title="Connexions">
      <ul className="space-y-2 text-sm text-surface-foreground">
        {providers.length === 0 ? <li className="text-muted-foreground">Aucune.</li> : null}
        {providers.map((p) => (
          <li key={p}>{p === "email" ? "E-mail et mot de passe" : p === "google" ? "Google (connexion)" : p}</li>
        ))}
      </ul>
      <Note>Il s'agit des méthodes avec lesquelles vous vous connectez. Aucune application ou site externe n'a d'accès à votre compte PANU, et PANU ne se connecte jamais automatiquement à un compte externe.</Note>
    </Card>
  );
}

export function ManageInfoSection() {
  return (
    <>
      <Card title="Quelles données PANU enregistre">
        <ul className="list-disc space-y-1 pl-5 text-sm text-surface-foreground">
          <li>Votre compte : e-mail et mot de passe (chiffré).</li>
          <li>Votre profil : nom, identifiant, photo, couverture, biographie, ville, pays, site web, liens.</li>
          <li>Vos contenus : publications, stories, créations du Studio IA.</li>
          <li>Vos interactions : J'aime, enregistrements, commentaires, abonnements, blocages, vues.</li>
          <li>Vos réglages, vos crédits et votre temps d'utilisation.</li>
          <li>Facultatif : votre numéro de téléphone, privé, et votre date de naissance.</li>
        </ul>
      </Card>
      <Card title="Comment elles sont utilisées">
        <Note>Pour faire fonctionner votre compte, afficher votre profil selon vos réglages de visibilité, calculer vos statistiques et vous suggérer des personnes. PANU ne vend pas vos données et n'affiche pas de publicité.</Note>
      </Card>
      <Card title="Vos options">
        <Link to="/parametres/$section" params={{ section: "compte" }} className="block text-sm font-medium text-accent underline">Télécharger mes données ou supprimer mon compte</Link>
        <Link to="/parametres/$section" params={{ section: "infos-profil" }} className="block text-sm font-medium text-accent underline">Choisir les informations visibles</Link>
        <Link to="/parametres/$section" params={{ section: "audience-par-defaut" }} className="block text-sm font-medium text-accent underline">Gérer l'audience par défaut</Link>
      </Card>
    </>
  );
}

export function PrivacyHelp() {
  return (
    <>
      <ManageInfoSection />
      <Card title="Autorisations et demandes">
        <Link to="/parametres/$section" params={{ section: "autorisations-appareil" }} className="block text-sm font-medium text-accent underline">Autorisations de l'appareil</Link>
        <Link to="/parametres/$section" params={{ section: "trouver" }} className="block text-sm font-medium text-accent underline">Comment on peut me trouver</Link>
        <Note>Pour une demande concernant vos données (accès, copie, suppression), utilisez les options ci-dessus : elles s'appliquent immédiatement à votre compte.</Note>
      </Card>
    </>
  );
}

export function WhatsAppSection() {
  const { profile } = useAuth();
  const code = useQuery({
    queryKey: ["referral-code-wa", profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_referral_code");
      if (error) throw error;
      return data;
    },
  });
  function open(text: string, url: string) {
    window.open(shareUrl("whatsapp", text, url), "_blank", "noopener,noreferrer");
  }
  if (!profile) return null;
  const profileLink = `${window.location.origin}/@${profile.username}`;
  const inviteLink = code.data ? referralLink(window.location.origin, code.data) : "";
  return (
    <Card>
      <Note>Le partage vers WhatsApp est facultatif : PANU ouvre WhatsApp avec un message prêt, vous choisissez la personne et vous envoyez vous-même. Votre compte WhatsApp n'est jamais connecté à PANU.</Note>
      <button type="button" onClick={() => open(`Retrouve-moi sur PANU : ${profile.display_name}`, profileLink)} className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold text-surface-foreground">
        <MessageCircle className="size-4" /> Partager mon profil
      </button>
      <button type="button" disabled={!inviteLink} onClick={() => open("Rejoins-moi sur PANU !", inviteLink)} className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground">
        <MessageCircle className="size-4" /> Envoyer mon invitation
      </button>
      <Note>Pour partager une publication, utilisez le bouton Partager sous la publication.</Note>
    </Card>
  );
}

export function FamilySection() {
  return (
    <Unavailable title="Centre familial">
      La supervision familiale et le contrôle parental ne sont pas encore développés dans PANU. Aucun réglage de ce type n'est proposé tant que les autorisations nécessaires n'existent pas. En attendant, vous pouvez verrouiller votre profil et bloquer des comptes.
    </Unavailable>
  );
}

export function PagesSection() {
  return (
    <Unavailable title="Pages">
      Les Pages (comptes d'organisation avec administrateurs) n'existent pas encore dans PANU. Rien n'est à gérer pour le moment.
    </Unavailable>
  );
}

export function AvatarsSection() {
  return (
    <Unavailable title="Avatars">
      La création d'avatars n'est pas encore disponible. Votre photo de profil se modifie depuis « Modifier le profil ».
    </Unavailable>
  );
}

export function ProIntegrationsSection() {
  return (
    <Unavailable title="Intégrations professionnelles">
      Aucune intégration professionnelle n'est proposée pour le moment, donc aucun service n'est connecté à votre compte.
    </Unavailable>
  );
}

export { EmptyState, nativeShare };

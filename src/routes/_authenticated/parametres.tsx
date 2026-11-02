import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  ChevronDown,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useSettings, type UserSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import {
  canDeleteAccount,
  DELETE_CONFIRMATION_WORD,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
} from "@/lib/account-rules";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — PANU" },
      {
        name: "description",
        content: "Gérez votre compte PANU : confidentialité, sécurité, notifications et langue.",
      },
      { property: "og:title", content: "Paramètres — PANU" },
      { property: "og:description", content: "Compte, confidentialité et sécurité sur PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParametresPage,
});

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Section({
  icon: Icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: typeof Bell;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 text-sm text-surface-foreground">{label}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open ? <div className="space-y-3 px-4 pt-1 pb-4">{children}</div> : null}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="flex-1">
        <span className="block text-sm text-surface-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

function ParametresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { settings, update } = useSettings();
  const deleteAccount = useServerFn(deleteMyAccount);

  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));
  const [signingOut, setSigningOut] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  function save(patch: Partial<UserSettings>) {
    update.mutate(patch, {
      onSuccess: () => toast.success("Réglage enregistré"),
      onError: () => toast.error("Impossible d'enregistrer ce réglage."),
    });
  }

  async function signOutLocally() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/connexion", replace: true });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOutLocally();
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    const problem = validateNewPassword(password, confirmation);
    setPasswordError(problem);
    if (problem) return;
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setConfirmation("");
    toast.success("Mot de passe modifié");
  }

  async function handleDelete() {
    if (!canDeleteAccount(typed)) return;
    setDeleting(true);
    try {
      await deleteAccount({ data: { confirm: "SUPPRIMER" } });
      await signOutLocally();
    } catch (error) {
      setDeleting(false);
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  return (
    <AppShell title="Paramètres">
      <div className="space-y-6 px-4 py-5">
        <section>
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Compte
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            <Section
              icon={UserCog}
              label="Informations du compte"
              open={open === "infos"}
              onToggle={() => toggle("infos")}
            >
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Adresse e-mail</dt>
                  <dd className="text-surface-foreground">{user?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nom d'utilisateur</dt>
                  <dd className="text-surface-foreground">
                    {profile ? `@${profile.username}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nom affiché</dt>
                  <dd className="text-surface-foreground">{profile?.display_name ?? "—"}</dd>
                </div>
              </dl>
              <Link
                to="/profil/modifier"
                className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold text-surface-foreground hover:bg-muted"
              >
                Modifier mon profil
              </Link>
            </Section>

            <Section
              icon={Lock}
              label="Confidentialité"
              open={open === "privacy"}
              onToggle={() => toggle("privacy")}
            >
              <ToggleRow
                label="Autoriser le remix par défaut"
                hint="Appliqué à vos prochaines vidéos ; modifiable à chaque publication."
                checked={settings.default_allow_remix}
                onChange={(value) => save({ default_allow_remix: value })}
              />
              <p className="text-xs text-muted-foreground">
                Seuls votre nom, votre photo, votre bio et vos publications sont visibles
                publiquement. Votre e-mail et votre localisation ne le sont jamais.
              </p>
              <Link to="/confidentialite" className="text-sm font-medium text-primary underline">
                Lire la politique de confidentialité
              </Link>
            </Section>

            <Section
              icon={ShieldCheck}
              label="Sécurité"
              open={open === "security"}
              onToggle={() => toggle("security")}
            >
              <form onSubmit={handlePassword} className="space-y-3">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={`Nouveau mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum)`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  aria-label="Nouveau mot de passe"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className={inputClass}
                  aria-label="Confirmer le mot de passe"
                />
                {passwordError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {passwordError}
                  </p>
                ) : null}
                <ActionButton type="submit" disabled={savingPassword || !password}>
                  {savingPassword ? "Enregistrement…" : "Changer le mot de passe"}
                </ActionButton>
              </form>
            </Section>
          </div>
        </section>

        <section>
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Préférences
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            <Section
              icon={Bell}
              label="Notifications"
              open={open === "notifs"}
              onToggle={() => toggle("notifs")}
            >
              <ToggleRow
                label="J'aime"
                checked={settings.notify_likes}
                onChange={(value) => save({ notify_likes: value })}
              />
              <ToggleRow
                label="Commentaires"
                checked={settings.notify_comments}
                onChange={(value) => save({ notify_comments: value })}
              />
              <ToggleRow
                label="Nouveaux abonnés"
                checked={settings.notify_follows}
                onChange={(value) => save({ notify_follows: value })}
              />
              <ToggleRow
                label="Messages"
                checked={settings.notify_messages}
                onChange={(value) => save({ notify_messages: value })}
              />
              <p className="text-xs text-muted-foreground">
                Vos choix sont enregistrés et seront appliqués dès l'ouverture du centre de
                notifications.
              </p>
            </Section>

            <Section
              icon={Globe}
              label="Langue"
              open={open === "lang"}
              onToggle={() => toggle("lang")}
            >
              <div className="flex gap-2">
                {(
                  [
                    ["fr", "Français"],
                    ["en", "English"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => save({ language: code })}
                    aria-pressed={settings.language === code}
                    className={`h-10 flex-1 rounded-full border text-sm font-semibold ${
                      settings.language === code
                        ? "border-transparent bg-brand text-primary-foreground"
                        : "border-border text-surface-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Votre choix est enregistré ; l'interface est pour l'instant disponible en français.
              </p>
            </Section>
          </div>
        </section>

        <section>
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Assistance
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            <Section
              icon={LifeBuoy}
              label="Aide et informations légales"
              open={open === "help"}
              onToggle={() => toggle("help")}
            >
              <Link
                to="/conditions"
                className="flex items-center gap-2 text-sm text-surface-foreground underline"
              >
                <FileText className="size-4" strokeWidth={1.75} /> Conditions d'utilisation
              </Link>
              <Link
                to="/confidentialite"
                className="flex items-center gap-2 text-sm text-surface-foreground underline"
              >
                <FileText className="size-4" strokeWidth={1.75} /> Politique de confidentialité
              </Link>
            </Section>
          </div>
        </section>

        <section>
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Session
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left disabled:opacity-70"
            >
              <LogOut className="size-4 text-destructive" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-destructive">
                {signingOut ? "Déconnexion…" : "Se déconnecter"}
              </span>
            </button>
            <Section
              icon={Trash2}
              label="Supprimer mon compte"
              open={open === "delete"}
              onToggle={() => toggle("delete")}
            >
              <p className="text-xs text-muted-foreground">
                Action définitive : votre profil, vos publications, vos stories, vos créations IA et
                vos crédits seront supprimés. Tapez <strong>{DELETE_CONFIRMATION_WORD}</strong> pour
                confirmer.
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className={inputClass}
                aria-label="Mot de confirmation"
                autoCapitalize="characters"
              />
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDeleteAccount(typed) || deleting}
                className="inline-flex h-10 items-center rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </Section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

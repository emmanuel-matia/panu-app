import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isUsernameAvailable, normalizeUsername } from "@/lib/profiles";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription — PANU" },
      {
        name: "description",
        content:
          "Créez votre compte PANU et rejoignez la plateforme africaine numérique des créateurs.",
      },
      { property: "og:title", content: "Inscription — PANU" },
      {
        property: "og:description",
        content: "Rejoignez PANU : créez, partagez, apprenez, achetez, gagnez.",
      },
    ],
  }),
  component: InscriptionPage,
});

function InscriptionPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEnvoyee, setConfirmationEnvoyee] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/profil", replace: true });
    }
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const normalized = normalizeUsername(username);
    if (normalized.length < 3) {
      setError(
        "Le nom d'utilisateur doit contenir au moins 3 caractères (lettres, chiffres, . ou _).",
      );
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSubmitting(true);

    if (!(await isUsernameAvailable(normalized))) {
      setSubmitting(false);
      setError("Ce nom d'utilisateur est déjà pris.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/connexion`,
        data: { username: normalized, display_name: normalized },
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Un compte existe déjà avec cette adresse e-mail."
          : signUpError.message,
      );
      return;
    }

    if (!data.session) {
      setConfirmationEnvoyee(true);
      return;
    }

    void navigate({ to: "/profil", replace: true });
  }

  if (confirmationEnvoyee) {
    return (
      <AuthShell
        title="Vérifiez votre e-mail"
        subtitle="Une dernière étape avant d'entrer dans PANU."
        footer={
          <Link to="/connexion" className="font-semibold text-accent underline">
            Retour à la connexion
          </Link>
        }
      >
        <p className="text-sm text-surface-foreground">
          Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Ouvrez ce
          lien pour activer votre compte, puis connectez-vous.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Rejoignez PANU"
      subtitle="Créez. Partagez. Apprenez. Achetez. Gagnez."
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link to="/connexion" className="font-semibold text-accent underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-xs font-medium text-muted-foreground">
            Nom d'utilisateur
          </label>
          <input
            id="username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">
            Adresse e-mail
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="signup-password"
            className="text-xs font-medium text-muted-foreground"
          >
            Mot de passe
          </label>
          <input
            id="signup-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <ActionButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Création du compte…" : "Créer mon compte"}
        </ActionButton>
      </form>
    </AuthShell>
  );
}

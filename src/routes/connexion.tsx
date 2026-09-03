import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — PANU" },
      {
        name: "description",
        content: "Connectez-vous à PANU pour créer, partager et monétiser vos contenus.",
      },
      { property: "og:title", content: "Connexion — PANU" },
      { property: "og:description", content: "Accédez à votre compte PANU." },
    ],
  }),
  component: ConnexionPage,
});

function ConnexionPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/profil", replace: true });
    }
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "E-mail ou mot de passe incorrect."
          : signInError.message === "Email not confirmed"
            ? "Confirmez votre adresse e-mail avant de vous connecter."
            : signInError.message,
      );
      return;
    }

    void navigate({ to: "/profil", replace: true });
  }

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous pour retrouver votre espace PANU."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-semibold text-accent underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
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
          {submitting ? "Connexion…" : "Se connecter"}
        </ActionButton>

        <Link
          to="/mot-de-passe-oublie"
          className="block text-center text-xs text-muted-foreground underline"
        >
          Mot de passe oublié ?
        </Link>
      </form>

      <Link
        to="/"
        className="mt-5 block text-center text-xs text-muted-foreground underline"
      >
        Continuer sans compte
      </Link>
    </AuthShell>
  );
}

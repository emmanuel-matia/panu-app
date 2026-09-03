import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — PANU" },
      {
        name: "description",
        content: "Recevez un lien pour réinitialiser le mot de passe de votre compte PANU.",
      },
      { property: "og:title", content: "Mot de passe oublié — PANU" },
      {
        property: "og:description",
        content: "Réinitialisez l'accès à votre compte PANU en toute sécurité.",
      },
    ],
  }),
  component: MotDePasseOubliePage,
});

function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setEnvoye(true);
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien de réinitialisation."
      footer={
        <Link to="/connexion" className="font-semibold text-accent underline">
          Retour à la connexion
        </Link>
      }
    >
      {envoye ? (
        <p className="text-sm text-surface-foreground">
          Si un compte PANU existe pour <strong>{email}</strong>, un lien de
          réinitialisation vient d'être envoyé.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground">
              Adresse e-mail
            </label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <ActionButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Envoi…" : "Envoyer le lien"}
          </ActionButton>
        </form>
      )}
    </AuthShell>
  );
}

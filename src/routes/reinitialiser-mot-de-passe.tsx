import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — PANU" },
      {
        name: "description",
        content: "Définissez un nouveau mot de passe pour votre compte PANU.",
      },
      { property: "og:title", content: "Nouveau mot de passe — PANU" },
      { property: "og:description", content: "Sécurisez à nouveau votre compte PANU." },
    ],
  }),
  component: ReinitialiserPage,
});

function ReinitialiserPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(
        updateError.message.includes("session")
          ? "Lien expiré ou invalide. Demandez un nouveau lien de réinitialisation."
          : updateError.message,
      );
      return;
    }

    setSucces(true);
    void navigate({ to: "/profil", replace: true });
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe solide."
      footer={
        <Link to="/connexion" className="font-semibold text-accent underline">
          Retour à la connexion
        </Link>
      }
    >
      {succes ? (
        <p className="text-sm text-surface-foreground">Mot de passe mis à jour.</p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-medium text-muted-foreground">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-xs font-medium text-muted-foreground"
            >
              Confirmez le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <ActionButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Mise à jour…" : "Enregistrer"}
          </ActionButton>
        </form>
      )}
    </AuthShell>
  );
}

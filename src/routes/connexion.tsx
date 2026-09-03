import { createFileRoute, Link } from "@tanstack/react-router";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";

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
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
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
            autoComplete="current-password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <ActionButton type="submit" className="w-full" disabled>
          Se connecter
        </ActionButton>
        <p className="text-center text-xs text-muted-foreground">
          L'authentification sera activée à l'étape suivante.
        </p>
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

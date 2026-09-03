import { createFileRoute, Link } from "@tanstack/react-router";

import { ActionButton } from "@/components/common/ActionButton";
import { AuthShell } from "@/components/layout/AuthShell";

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
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-xs font-medium text-muted-foreground">
            Nom d'utilisateur
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
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
            autoComplete="email"
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
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <ActionButton type="submit" className="w-full" disabled>
          Créer mon compte
        </ActionButton>
        <p className="text-center text-xs text-muted-foreground">
          L'inscription sera activée à l'étape suivante.
        </p>
      </form>
    </AuthShell>
  );
}

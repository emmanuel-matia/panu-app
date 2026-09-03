import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Globe,
  LifeBuoy,
  Lock,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";

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
    ],
  }),
  component: ParametresPage,
});

const sections = [
  {
    titre: "Compte",
    entrees: [
      { icon: UserCog, label: "Informations du compte" },
      { icon: Lock, label: "Confidentialité" },
      { icon: ShieldCheck, label: "Sécurité" },
    ],
  },
  {
    titre: "Préférences",
    entrees: [
      { icon: Bell, label: "Notifications" },
      { icon: Globe, label: "Langue et région" },
    ],
  },
  {
    titre: "Assistance",
    entrees: [{ icon: LifeBuoy, label: "Aide et signalements" }],
  },
] as const;

function ParametresPage() {
  return (
    <AppShell title="Paramètres">
      <div className="space-y-6 px-4 py-5">
        {sections.map((section) => (
          <section key={section.titre}>
            <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {section.titre}
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
              {section.entrees.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0 disabled:opacity-70"
                >
                  <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="flex-1 text-sm text-surface-foreground">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Session
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {user?.email ? (
              <p className="border-b border-border px-4 py-3.5 text-sm text-surface-foreground">
                Connecté en tant que <strong>{user.email}</strong>
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-70"
            >
              <LogOut className="size-4 text-destructive" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-destructive">
                {signingOut ? "Déconnexion…" : "Se déconnecter"}
              </span>
            </button>
          </div>
        </section>

        <p className="px-1 text-xs text-muted-foreground">
          Les réglages ci-dessus seront activés dans une prochaine étape.
        </p>
      </div>
    </AppShell>
  );
}

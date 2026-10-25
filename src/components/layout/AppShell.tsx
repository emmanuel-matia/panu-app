import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { PageHeader } from "./PageHeader";

/**
 * Coquille de l'application : en-tête de page + contenu + navigation basse.
 * Utilisée par toutes les pages internes (hors Connexion / Inscription).
 */
export function AppShell({
  title,
  subtitle,
  headerAction,
  header,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  headerAction?: ReactNode | undefined;
  /** En-tête personnalisé (remplace l'en-tête standard, ex. Accueil). */
  header?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      {header ?? <PageHeader title={title} subtitle={subtitle} action={headerAction} />}
      <main className="mx-auto w-full max-w-2xl">{children}</main>
      <BottomNav />
    </div>
  );
}

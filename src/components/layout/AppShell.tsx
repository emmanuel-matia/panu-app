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
  children,
}: {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={title} subtitle={subtitle} action={headerAction} />
      <main className="mx-auto w-full max-w-2xl">{children}</main>
      <BottomNav />
    </div>
  );
}

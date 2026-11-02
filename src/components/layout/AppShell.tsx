import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { BottomNav } from "./BottomNav";
import { PageHeader } from "./PageHeader";

/**
 * Coquille de l'application : en-tête de page + contenu + navigation basse.
 * Utilisée par toutes les pages internes (hors Connexion / Inscription / Bienvenue).
 */
export function AppShell({
  title,
  subtitle,
  headerAction,
  header,
  bottomBar,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  headerAction?: ReactNode | undefined;
  /** En-tête personnalisé (remplace l'en-tête standard, ex. Accueil). */
  header?: ReactNode | undefined;
  /** Barre fixée juste au-dessus de la navigation basse (ex. Studio IA sur l'accueil). */
  bottomBar?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        bottomBar
          ? "pb-[calc(10.5rem+env(safe-area-inset-bottom))]"
          : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
      )}
    >
      {header ?? <PageHeader title={title} subtitle={subtitle} action={headerAction} />}
      <main className="mx-auto w-full max-w-2xl">{children}</main>
      {bottomBar ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
          <div className="mx-auto w-full max-w-2xl">{bottomBar}</div>
        </div>
      ) : null}
      <BottomNav />
    </div>
  );
}

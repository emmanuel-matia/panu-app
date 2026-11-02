import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Mise en page simple pour les textes légaux. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/bienvenue" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

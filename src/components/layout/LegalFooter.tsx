import { Link } from "@tanstack/react-router";

import { LEGAL_DOCUMENTS, LEGAL_PUBLISHER } from "@/lib/legal-documents";
import { cn } from "@/lib/utils";

/** Pied de page juridique de PANU : accès permanent aux six documents et au contact. */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("space-y-2 text-center text-[0.6875rem] leading-relaxed text-muted-foreground", className)}>
      <nav aria-label="Documents légaux" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        <Link to="/documents-legaux" className="font-semibold text-accent underline">
          Documents légaux
        </Link>
        {LEGAL_DOCUMENTS.map((d) => (
          <Link key={d.id} to={d.path} className="hover:text-foreground hover:underline">
            {d.shortTitle}
          </Link>
        ))}
      </nav>
      <p>
        © PANU — {LEGAL_PUBLISHER.name} · RCCM {LEGAL_PUBLISHER.rccm} ·{" "}
        <a href={`mailto:${LEGAL_PUBLISHER.email}`} className="underline hover:text-foreground">
          {LEGAL_PUBLISHER.email}
        </a>
      </p>
    </footer>
  );
}

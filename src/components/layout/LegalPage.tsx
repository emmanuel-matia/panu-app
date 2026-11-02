import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import {
  LEGAL_DOCUMENTS,
  LEGAL_FINAL_PROVISIONS,
  LEGAL_PUBLISHER,
  type LegalBlock,
  type LegalDocument,
} from "@/lib/legal-documents";

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return block.includes("@") && !block.includes(" ") ? (
      <p><a href={`mailto:${block}`} className="font-semibold text-accent underline">{block}</a></p>
    ) : (
      <p>{block}</p>
    );
  }
  if ("ol" in block) {
    return <ol className="list-decimal space-y-1 pl-5">{block.ol.map((item) => <li key={item}>{item}</li>)}</ol>;
  }
  return <ul className="list-disc space-y-1 pl-5">{block.ul.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** Affiche un document juridique officiel de PANU, avec l'identification de l'éditeur. */
export function LegalPage({ document: doc }: { document: LegalDocument }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/bienvenue" }))}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>
        <p className="mt-6 text-xs font-semibold tracking-wide text-accent uppercase">Document {doc.number}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{doc.title}</h1>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
          <dt className="font-semibold text-surface-foreground">Éditeur et exploitant</dt><dd>{LEGAL_PUBLISHER.name}</dd>
          <dt className="font-semibold text-surface-foreground">Responsable</dt><dd>{LEGAL_PUBLISHER.manager}</dd>
          <dt className="font-semibold text-surface-foreground">RCCM</dt><dd>{LEGAL_PUBLISHER.rccm}</dd>
          <dt className="font-semibold text-surface-foreground">Adresse</dt><dd>{LEGAL_PUBLISHER.address}</dd>
          <dt className="font-semibold text-surface-foreground">E-mail</dt>
          <dd><a href={`mailto:${LEGAL_PUBLISHER.email}`} className="text-accent underline">{LEGAL_PUBLISHER.email}</a></dd>
          <dt className="font-semibold text-surface-foreground">Entrée en vigueur</dt><dd>{LEGAL_PUBLISHER.effectiveDate}</dd>
          <dt className="font-semibold text-surface-foreground">Version</dt><dd>{LEGAL_PUBLISHER.version}</dd>
        </dl>

        <p className="mt-3 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs text-surface-foreground">
          Projet de document (version {LEGAL_PUBLISHER.version}), en attente de validation définitive avant publication.
        </p>

        <div className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {doc.articles.map((article) => (
            <section key={article.title} className="space-y-3">
              <h2 className="mt-6 text-base font-semibold text-foreground">{article.title}</h2>
              {article.blocks.map((block, i) => <Block key={i} block={block} />)}
            </section>
          ))}
          <section className="mt-8 space-y-3 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-base font-semibold text-foreground">{LEGAL_FINAL_PROVISIONS.title}</h2>
            {LEGAL_FINAL_PROVISIONS.blocks.map((block, i) => <Block key={i} block={block} />)}
          </section>
        </div>

        <nav aria-label="Autres documents juridiques" className="mt-10 border-t border-border pt-6">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Documents juridiques de PANU</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/documents-legaux" className="font-semibold text-accent underline">Tous les documents légaux</Link>
            </li>
            {LEGAL_DOCUMENTS.filter((d) => d.id !== doc.id).map((d) => (
              <li key={d.id}>
                <Link to={d.path} className="text-accent underline">{d.number}. {d.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

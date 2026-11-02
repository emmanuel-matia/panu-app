import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Flag, Mail, ShieldCheck } from "lucide-react";

import { LegalFooter } from "@/components/layout/LegalFooter";
import { useAuth } from "@/hooks/useAuth";
import { useLegalConsent } from "@/hooks/useLegalConsent";
import { LEGAL_DOCUMENTS, LEGAL_PUBLISHER } from "@/lib/legal-documents";

export const Route = createFileRoute("/documents-legaux")({
  head: () => ({
    meta: [
      { title: "Documents légaux — PANU" },
      {
        name: "description",
        content: "Les six documents juridiques de PANU : CGU, confidentialité, cookies, règles communautaires, abonnements et IA.",
      },
      { property: "og:title", content: "Documents légaux de PANU" },
      {
        property: "og:description",
        content: "CGU, confidentialité, cookies, modération, abonnements et Studio IA — édités par ETS GREEN MATIA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsLegauxPage,
});

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

function MyConsent() {
  const { current, records, loaded } = useLegalConsent();
  if (!loaded) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 text-sm">
      <h2 className="flex items-center gap-2 font-semibold text-foreground">
        <ShieldCheck className="size-4 text-accent" /> Votre acceptation
      </h2>
      {current ? (
        <p className="mt-2 text-muted-foreground">
          Vous avez accepté les CGU et la Politique de confidentialité (version {current.version}) le{" "}
          <strong className="text-surface-foreground">{dateFormat.format(new Date(current.accepted_at))}</strong>.
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground">
          Aucune acceptation de la version actuelle n'est enregistrée pour votre compte.
        </p>
      )}
      {records.length > 1 ? (
        <p className="mt-1 text-xs text-muted-foreground">{records.length} acceptations enregistrées au total.</p>
      ) : null}
    </section>
  );
}

function DocumentsLegauxPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/" }))}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Documents légaux</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Édités par {LEGAL_PUBLISHER.name} (RCCM {LEGAL_PUBLISHER.rccm}), représenté par {LEGAL_PUBLISHER.manager}.
          </p>
          <p className="mt-3 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs text-surface-foreground">
            Version {LEGAL_PUBLISHER.version} — projets en attente de validation définitive. Entrée en vigueur :{" "}
            {LEGAL_PUBLISHER.effectiveDate}.
          </p>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {LEGAL_DOCUMENTS.map((d) => (
            <li key={d.id}>
              <Link to={d.path} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-accent">
                  {d.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-surface-foreground">{d.title}</span>
                  <span className="block text-xs text-muted-foreground">{d.description}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        {session ? <MyConsent /> : null}

        <section className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Flag className="size-4 text-accent" /> Signaler un contenu abusif
          </h2>
          <p className="text-muted-foreground">
            Sur une publication, touchez le menu <strong className="text-surface-foreground">⋮</strong> puis{" "}
            <strong className="text-surface-foreground">Signaler</strong> et choisissez le motif. L'équipe de modération
            traite chaque signalement, comme prévu par les{" "}
            <Link to="/regles-communaute" className="font-semibold text-accent underline">Règles communautaires</Link>.
          </p>
          <p className="text-muted-foreground">
            Pour un autre problème (compte, message, story), écrivez-nous à l'adresse ci-dessous.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Mail className="size-4 text-accent" /> Contact
          </h2>
          <p className="text-muted-foreground">{LEGAL_PUBLISHER.address}</p>
          <a href={`mailto:${LEGAL_PUBLISHER.email}`} className="font-semibold text-accent underline">
            {LEGAL_PUBLISHER.email}
          </a>
        </section>

        <LegalFooter className="pt-2" />
      </div>
    </div>
  );
}

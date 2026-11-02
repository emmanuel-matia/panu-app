import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDocument } from "@/lib/legal-documents";

const doc = legalDocument("abonnements");

export const Route = createFileRoute("/conditions-abonnement")({
  head: () => ({
    meta: [
      { title: `${doc.shortTitle} — PANU` },
      { name: "description", content: doc.description },
      { property: "og:title", content: `${doc.title} — PANU` },
      { property: "og:description", content: doc.description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConditionsAbonnementPage,
});

function ConditionsAbonnementPage() {
  return <LegalPage document={doc} />;
}

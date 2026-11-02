import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — PANU" },
      { name: "description", content: "Comment PANU collecte, utilise et protège vos données." },
      { property: "og:title", content: "Politique de confidentialité — PANU" },
      { property: "og:description", content: "Comment PANU collecte, utilise et protège vos données." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Données collectées</h2>
      <p>
        Votre adresse e-mail (ou votre compte Google), votre profil public (nom, nom d'utilisateur, photo,
        biographie, localisation facultative), vos publications, commentaires, j'aime et abonnements.
      </p>
      <h2>Utilisation</h2>
      <p>
        Ces données servent uniquement à faire fonctionner PANU : afficher votre profil et vos contenus, construire
        votre fil et gérer vos crédits. Vos créations du Studio IA restent privées tant que vous ne les publiez pas.
      </p>
      <h2>Services d'intelligence artificielle</h2>
      <p>
        Les textes que vous saisissez dans le Studio IA sont transmis aux fournisseurs d'IA utilisés pour générer la
        création demandée.
      </p>
      <h2>Vos droits</h2>
      <p>Vous pouvez modifier votre profil à tout moment et supprimer vos publications et stories.</p>
    </LegalPage>
  );
}

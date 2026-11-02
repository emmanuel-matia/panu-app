import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/conditions")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — PANU" },
      { name: "description", content: "Les règles d'utilisation de la plateforme PANU." },
      { property: "og:title", content: "Conditions d'utilisation — PANU" },
      { property: "og:description", content: "Les règles d'utilisation de la plateforme PANU." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConditionsPage,
});

function ConditionsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        Ces conditions encadrent l'utilisation de PANU. En créant un compte, vous les acceptez.
      </p>
      <h2>Votre compte</h2>
      <p>
        Vous êtes responsable de votre compte et des informations que vous fournissez. Un compte est personnel.
      </p>
      <h2>Vos contenus</h2>
      <p>
        Vous restez propriétaire de ce que vous publiez. Vous garantissez avoir les droits nécessaires sur vos
        vidéos, images, musiques et textes. Les contenus illégaux, haineux, violents ou portant atteinte aux droits
        d'autrui sont interdits et peuvent être supprimés.
      </p>
      <h2>Studio IA et crédits</h2>
      <p>
        Les créations du Studio IA consomment des crédits. Les crédits offerts à l'inscription sont attribués une
        seule fois par compte et n'ont pas de valeur monétaire. Une génération qui échoue ne consomme pas de crédits.
      </p>
      <h2>Évolution</h2>
      <p>Ces conditions peuvent évoluer ; vous serez informé des changements importants.</p>
    </LegalPage>
  );
}

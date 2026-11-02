import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/layout/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies et stockage local — PANU" },
      { name: "description", content: "Quels cookies et données locales PANU utilise sur le web, et comment les gérer." },
      { property: "og:title", content: "Cookies et stockage local — PANU" },
      { property: "og:description", content: "Ce que PANU enregistre dans votre navigateur." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage title="Cookies et stockage local">
      <p>
        Sur la version web, PANU enregistre quelques informations dans votre navigateur. Elles servent uniquement au
        fonctionnement de l'application : PANU n'utilise ni cookie publicitaire ni outil de suivi.
      </p>
      <h2>Ce qui est enregistré</h2>
      <p>
        Votre session de connexion (pour rester connecté), votre apparence (mode clair ou sombre, taille du texte,
        contraste, animations), le choix « Découvrir d'abord » de l'écran d'accueil et, le cas échéant, le code de
        parrainage d'un lien d'invitation en attendant la création de votre compte.
      </p>
      <h2>Consentement</h2>
      <p>
        Ces données sont strictement nécessaires : elles ne demandent pas de consentement. Si PANU ajoute un jour des
        cookies de mesure ou de publicité, votre accord sera demandé et vous pourrez le modifier ici.
      </p>
      <h2>Les supprimer</h2>
      <p>
        Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur ; vous serez alors déconnecté et
        vos préférences d'apparence reviendront aux valeurs par défaut (vos réglages enregistrés dans votre compte sont
        conservés).
      </p>
    </LegalPage>
  );
}

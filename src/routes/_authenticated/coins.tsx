import { createFileRoute } from "@tanstack/react-router";
import { CoinsPage } from "@/features/wallet/CoinsPage";

export const Route = createFileRoute("/_authenticated/coins")({
  head: () => ({ meta: [
    { title: "PANU Coins — Portefeuille et recharges" },
    { name: "description", content: "Votre solde PANU Coins, les packs disponibles et l’historique sécurisé de vos achats." },
    { property: "og:title", content: "PANU Coins — Portefeuille et recharges" },
    { property: "og:description", content: "Le portefeuille PANU Coins et le suivi des recharges confirmées." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: CoinsPage,
});
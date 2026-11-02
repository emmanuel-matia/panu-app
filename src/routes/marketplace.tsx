import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — PANU" },
      { name: "description", content: "Achetez et vendez produits et services entre créateurs africains sur PANU." },
      { property: "og:title", content: "Marketplace — PANU" },
      { property: "og:description", content: "Produits et services des créateurs PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <AppShell title="Marketplace" subtitle="Acheter · Vendre">
      <EmptyState
        icon={ShoppingBag}
        title="Aucun produit pour le moment"
        description="La marketplace ouvrira dans une prochaine étape. Les produits et services des créateurs apparaîtront ici."
        action={
          <Link to="/">
            <ActionButton variant="outline">Retour à l'accueil</ActionButton>
          </Link>
        }
      />
    </AppShell>
  );
}

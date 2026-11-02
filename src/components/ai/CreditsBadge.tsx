import { Coins } from "lucide-react";

import { useCredits } from "@/hooks/useCredits";
import { AI_CREDIT_COSTS, PLAN_LABELS } from "@/lib/credits";

/** Solde de crédits et offre de l'utilisateur, avec le coût de chaque outil. */
export function CreditsBadge() {
  const credits = useCredits();
  const balance = credits.data?.balance ?? 0;
  return (
    <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Coins className="size-4 text-gold" />
          {credits.isPending ? "…" : `${balance} crédit${balance > 1 ? "s" : ""}`}
        </p>
        <span className="rounded-full border border-gold/50 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-gold">
          Offre {PLAN_LABELS[credits.data?.plan ?? "free"]}
        </span>
      </div>
      <p className="mt-1 text-[0.6875rem] text-muted-foreground">
        Texte {AI_CREDIT_COSTS.text} · Image {AI_CREDIT_COSTS.image} · Voix {AI_CREDIT_COSTS.voice} · Musique{" "}
        {AI_CREDIT_COSTS.music} · Vidéo {AI_CREDIT_COSTS.video} — une génération échouée est remboursée.
      </p>
    </div>
  );
}

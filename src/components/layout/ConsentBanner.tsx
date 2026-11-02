import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useLegalConsent } from "@/hooks/useLegalConsent";
import { CONSENT_VERSION, readPendingConsent } from "@/lib/legal-consent";

/**
 * Comptes connectés qui n'ont pas encore accepté la version courante des CGU
 * et de la politique de confidentialité (comptes créés avant, ou via « Se connecter avec Google »).
 */
export function ConsentBanner() {
  const { mustAccept, accept } = useLegalConsent();
  if (!mustAccept || readPendingConsent()) return null;

  return (
    <div
      role="region"
      aria-label="Acceptation des documents juridiques"
      className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 px-3"
    >
      <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-border bg-popover p-4 text-sm shadow-glow">
        <p className="text-surface-foreground">
          Pour continuer à utiliser PANU, lisez et acceptez nos{" "}
          <Link to="/conditions" className="font-semibold text-accent underline">CGU</Link> et notre{" "}
          <Link to="/confidentialite" className="font-semibold text-accent underline">Politique de confidentialité</Link>{" "}
          (version {CONSENT_VERSION}).
        </p>
        <button
          type="button"
          disabled={accept.isPending}
          onClick={() =>
            accept.mutate(undefined, {
              onSuccess: () => toast.success("Acceptation enregistrée."),
              onError: () => toast.error("Enregistrement impossible. Réessayez."),
            })
          }
          className="h-10 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {accept.isPending ? "Enregistrement…" : "J'ai lu et j'accepte"}
        </button>
      </div>
    </div>
  );
}

import { WifiOff } from "lucide-react";

import { useOnline } from "@/hooks/useDataMode";

/** Bandeau affiché dès que le téléphone perd Internet. */
export function NetworkBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-center text-xs font-semibold text-destructive-foreground"
    >
      <WifiOff className="size-3.5 shrink-0" />
      Hors ligne : publications, J'aime, commentaires et Studio IA reprendront au retour d'Internet.
    </div>
  );
}

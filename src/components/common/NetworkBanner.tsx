import { WifiOff } from "lucide-react";

import { useConnection, useOnline } from "@/hooks/useDataMode";
import { isSlowConnection } from "@/lib/data-saver-rules";

/** Bandeau d'état du réseau : hors ligne ou connexion faible (économie maximale appliquée). */
export function NetworkBanner() {
  const online = useOnline();
  const connection = useConnection();
  if (online && !isSlowConnection(connection)) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-center text-xs font-semibold text-destructive-foreground"
    >
      <WifiOff className="size-3.5 shrink-0" />
      {online
        ? "Connexion faible : économie de données maximale activée."
        : "Hors ligne : publications, J'aime, commentaires et Studio IA reprendront au retour d'Internet."}
    </div>
  );
}

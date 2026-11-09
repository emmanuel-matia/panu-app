import { useEffect, useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { effectiveDataMode, type ConnectionInfo } from "@/lib/data-saver-rules";
import type { DataMode } from "@/lib/prefs";

type NetConnection = ConnectionInfo & EventTarget;

function readConnection(): ConnectionInfo {
  if (typeof navigator === "undefined") return undefined;
  const c = (navigator as unknown as { connection?: NetConnection }).connection;
  return c ? { type: c.type, effectiveType: c.effectiveType, saveData: c.saveData } : undefined;
}

/** Connexion signalée par le téléphone, mise à jour quand elle change (Wi-Fi ↔ 4G ↔ 3G). */
export function useConnection(): ConnectionInfo {
  const [conn, setConn] = useState<ConnectionInfo>(undefined);
  useEffect(() => {
    setConn(readConnection());
    const c = (navigator as unknown as { connection?: NetConnection }).connection;
    if (!c?.addEventListener) return;
    const onChange = () => setConn(readConnection());
    c.addEventListener("change", onChange);
    return () => c.removeEventListener("change", onChange);
  }, []);
  return conn;
}

/** Mode d'économie de données réellement appliqué (choix de l'utilisateur, durci si réseau lent). */
export function useDataMode(): { mode: DataMode; chosen: DataMode; connection: ConnectionInfo; heavyWifiOnly: boolean } {
  const { prefs } = useSettings();
  const connection = useConnection();
  return {
    mode: effectiveDataMode(prefs.data_mode, prefs.data_saver, connection),
    chosen: prefs.data_mode,
    connection,
    heavyWifiOnly: prefs.heavy_wifi_only,
  };
}

/** En ligne / hors ligne, pour afficher clairement l'état du réseau. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

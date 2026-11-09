import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import type { LiveSummary } from "@/lib/live.functions";

/** Carte d'un direct réel (miniature, créateur, titre, spectateurs). */
export function LiveCard({ live, compact = false }: { live: LiveSummary; compact?: boolean }) {
  return (
    <Link
      to="/live/$streamId"
      params={{ streamId: live.id }}
      className={`block overflow-hidden rounded-lg border border-border bg-card ${compact ? "w-44 shrink-0" : ""}`}
    >
      <div className="relative aspect-video bg-muted">
        {live.coverUrl ? (
          <img src={live.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : live.hostAvatarUrl ? (
          <img src={live.hostAvatarUrl} alt="" className="h-full w-full object-cover opacity-70" loading="lazy" />
        ) : null}
        <span
          className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
            live.status === "live" ? "bg-destructive text-destructive-foreground" : "bg-background/80"
          }`}
        >
          {live.status === "live" ? "EN DIRECT" : "EN PAUSE"}
        </span>
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">
          <Users className="size-3" />
          {live.viewersCount}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2">
        {live.hostAvatarUrl ? (
          <img src={live.hostAvatarUrl} alt="" className="size-7 rounded-full object-cover" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {live.hostDisplayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{live.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{live.hostDisplayName}</span>
        </span>
      </div>
    </Link>
  );
}

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/** Secondes écoulées depuis `since` (mise à jour chaque seconde tant que `since` est défini). */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

function formatSeconds(s: number) {
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

export type GenerationPhase =
  | { phase: "idle" }
  | { phase: "running"; label: string; startedAt: number; hint?: string | undefined }
  | { phase: "done"; provider?: string | undefined; seconds: number }
  | { phase: "error"; message: string };

/** État réel d'une génération : en cours (avec chronomètre), réussie (fournisseur, durée) ou échouée. */
export function GenerationStatus({ state }: { state: GenerationPhase }) {
  const elapsed = useElapsed(state.phase === "running" ? state.startedAt : null);
  if (state.phase === "idle") return null;
  if (state.phase === "running") {
    return (
      <div aria-live="polite" className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin text-accent" />
          <span className="flex-1">{state.label}</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatSeconds(elapsed)}</span>
        </p>
        {state.hint ? <p className="mt-1 pl-6 text-[0.6875rem] text-muted-foreground">{state.hint}</p> : null}
      </div>
    );
  }
  if (state.phase === "done") {
    return (
      <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 text-accent" />
        Terminé en {formatSeconds(state.seconds)}
        {state.provider ? ` avec ${state.provider}` : ""}
      </p>
    );
  }
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{state.message}</span>
    </p>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";

import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { LiveCard } from "@/components/live/LiveCard";
import { Button } from "@/components/ui/button";
import { publicLives } from "@/lib/live.functions";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "LIVE — PANU" },
      { name: "description", content: "Les diffusions en direct des créateurs PANU." },
      { property: "og:title", content: "LIVE — PANU" },
      { property: "og:description", content: "Les diffusions en direct des créateurs PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lives"],
    queryFn: () => publicLives({ data: {} }),
    refetchInterval: 15_000,
  });

  return (
    <AppShell title="LIVE" subtitle="En direct">
      <div className="space-y-4 p-4">
        <Button asChild className="w-full" size="lg">
          <Link to="/studio-live">
            <Radio />
            Passer en direct
          </Link>
        </Button>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement des directs…</p> : null}
        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            Impossible de charger les directs.{" "}
            <button className="underline" onClick={() => void refetch()}>
              Réessayer
            </button>
          </p>
        ) : null}
        {data?.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.map((live) => (
              <LiveCard key={live.id} live={live} />
            ))}
          </div>
        ) : null}
      </div>
      {data && data.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Aucun live en cours"
          description="Aucun créateur n'est en direct pour le moment. Lancez le vôtre !"
          action={
            <Link to="/studio-live">
              <ActionButton>Démarrer un live</ActionButton>
            </Link>
          }
        />
      ) : null}
    </AppShell>
  );
}

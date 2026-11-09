import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { LiveCard } from "@/components/live/LiveCard";
import { publicLives } from "@/lib/live.functions";

/** Directs réellement en cours sur l'accueil ; rien n'est affiché s'il n'y en a aucun. */
export function LiveNowRow() {
  const { data } = useQuery({
    queryKey: ["lives"],
    queryFn: () => publicLives({ data: {} }),
    refetchInterval: 20_000,
  });
  if (!data?.length) return null;
  return (
    <section className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">En direct maintenant</h2>
        <Link to="/live" className="text-sm text-primary">
          Tout voir
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.map((live) => (
          <LiveCard key={live.id} live={live} compact />
        ))}
      </div>
    </section>
  );
}

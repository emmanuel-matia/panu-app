import { Link } from "@tanstack/react-router";
import { Briefcase, Clapperboard, Compass, Globe2, GraduationCap, Radio, ShoppingBag, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Shortcut = { label: string; icon: LucideIcon; tone: string } & (
  | { to: "/live" | "/marketplace" | "/formations" }
  | { to: "/decouvrir"; search: { categorie: string } }
);

const SHORTCUTS: Shortcut[] = [
  { label: "Live", icon: Radio, tone: "text-destructive", to: "/live" },
  { label: "Marketplace", icon: ShoppingBag, tone: "text-gold", to: "/marketplace" },
  { label: "Formations", icon: GraduationCap, tone: "text-accent", to: "/formations" },
  { label: "Afrique", icon: Globe2, tone: "text-electric", to: "/decouvrir", search: { categorie: "Afrique" } },
  { label: "Business", icon: Briefcase, tone: "text-gold", to: "/decouvrir", search: { categorie: "Business" } },
];

/** Accès rapides de l'accueil : Découvrir et Modèles en grand, puis les autres espaces de PANU. */
export function HomeShortcuts({ trending }: { trending: boolean }) {
  void trending;
  return (
    <div className="space-y-3 pb-2">
      <div className="grid grid-cols-2 gap-3 px-4">
        <Link
          to="/decouvrir"
          className="flex flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-electric to-primary px-3 py-4 text-center text-primary-foreground shadow-glow"
        >
          <Compass className="size-8" strokeWidth={1.75} />
          <span className="text-base font-bold">Découvrir</span>
          <span className="text-[0.6875rem] opacity-90">Vidéos, photos, tendances</span>
        </Link>
        <Link
          to="/modeles"
          className="flex flex-col items-center gap-1 rounded-3xl bg-brand px-3 py-4 text-center text-primary-foreground shadow-glow"
        >
          <Clapperboard className="size-8" strokeWidth={1.75} />
          <span className="text-base font-bold">Modèles</span>
          <span className="text-[0.6875rem] opacity-90">Templates IA réutilisables</span>
        </Link>
      </div>
      <nav aria-label="Raccourcis" className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {SHORTCUTS.map((s) => {
          const className = cn(
            "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-1 py-2.5 transition-colors hover:bg-muted",
          );
          const inner = (
            <>
              <s.icon className={cn("size-6", s.tone)} strokeWidth={1.75} />
              <span className="text-[0.6875rem] font-medium text-foreground">{s.label}</span>
            </>
          );
          return "search" in s ? (
            <Link key={s.label} to={s.to} search={s.search} className={className}>
              {inner}
            </Link>
          ) : (
            <Link key={s.label} to={s.to} className={className}>
              {inner}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

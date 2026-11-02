import { Link } from "@tanstack/react-router";
import { Briefcase, Flame, Globe2, GraduationCap, Radio, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Shortcut = { label: string; icon: LucideIcon; tone: string } & (
  | { to: "/"; search: { fil: "tendances" } }
  | { to: "/creer/video"; search: { mode: "ai" } }
  | { to: "/live" | "/marketplace" | "/formations" }
  | { to: "/explorer"; search: { categorie: string } }
);

const SHORTCUTS: Shortcut[] = [
  { label: "Tendances", icon: Flame, tone: "text-destructive", to: "/", search: { fil: "tendances" } },
  { label: "IA Studio", icon: Sparkles, tone: "text-primary", to: "/creer/video", search: { mode: "ai" } },
  { label: "Live", icon: Radio, tone: "text-destructive", to: "/live" },
  { label: "Marketplace", icon: ShoppingBag, tone: "text-gold", to: "/marketplace" },
  { label: "Formations", icon: GraduationCap, tone: "text-accent", to: "/formations" },
  { label: "Afrique", icon: Globe2, tone: "text-electric", to: "/explorer", search: { categorie: "Afrique" } },
  { label: "Business", icon: Briefcase, tone: "text-gold", to: "/explorer", search: { categorie: "Business" } },
];

/** Raccourcis de l'accueil vers les espaces de PANU. */
export function HomeShortcuts({ trending }: { trending: boolean }) {
  return (
    <nav aria-label="Raccourcis" className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {SHORTCUTS.map((s) => {
        const active = s.label === "Tendances" && trending;
        const className = cn(
          "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 transition-colors",
          active ? "border-electric bg-electric/15" : "border-border bg-surface hover:bg-muted",
        );
        const inner = (
          <>
            <s.icon className={cn("size-6", s.tone)} strokeWidth={1.75} />
            <span className="text-[0.6875rem] font-medium text-foreground">{s.label}</span>
          </>
        );
        if (s.label === "Tendances") {
          return (
            <Link key={s.label} to="/" search={trending ? {} : { fil: "tendances" }} className={className} aria-pressed={active}>
              {inner}
            </Link>
          );
        }
        return "search" in s ? (
          <Link key={s.label} to={s.to} search={s.search as never} className={className}>
            {inner}
          </Link>
        ) : (
          <Link key={s.label} to={s.to} className={className}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

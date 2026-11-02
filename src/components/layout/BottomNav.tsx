import { Link } from "@tanstack/react-router";
import { Bell, BookOpen, Clapperboard, Compass, Home, MessageCircle, Plus, Radio, ShoppingBag, User } from "lucide-react";
import type { ReactNode } from "react";

import { useSettings } from "@/hooks/useSettings";

const itemClass =
  "group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors";
const activeClass = "text-electric";

function Label({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="text-[0.6875rem] font-medium">{children}</span>
      <span className="absolute bottom-0.5 h-0.5 w-8 rounded-full bg-electric opacity-0 transition-opacity group-data-[status=active]:opacity-100" />
    </>
  );
}

const EXTRA_TABS = {
  messages: { to: "/messages", label: "Messages", icon: MessageCircle },
  notifications: { to: "/notifications", label: "Alertes", icon: Bell },
  marketplace: { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  formations: { to: "/formations", label: "Formations", icon: BookOpen },
} as const;

export function BottomNav() {
  const { prefs } = useSettings();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-2 pb-[env(safe-area-inset-bottom)]">
        <Link to="/" activeOptions={{ exact: true }} className={itemClass} activeProps={{ className: activeClass }}>
          <Home className="size-6" strokeWidth={1.75} />
          <Label>Accueil</Label>
        </Link>
        <Link to="/decouvrir" className={itemClass} activeProps={{ className: activeClass }}>
          <Compass className="size-6" strokeWidth={1.75} />
          <Label>Découvrir</Label>
        </Link>
        <Link to="/modeles" className={itemClass} activeProps={{ className: activeClass }}>
          <Clapperboard className="size-6" strokeWidth={1.75} />
          <Label>Modèles</Label>
        </Link>
        {prefs.tab_extras.map((id) => {
          const tab = EXTRA_TABS[id];
          const Icon = tab.icon;
          return (
            <Link key={id} to={tab.to} className={itemClass} activeProps={{ className: activeClass }}>
              <Icon className="size-6" strokeWidth={1.75} />
              <Label>{tab.label}</Label>
            </Link>
          );
        })}
        <div className="flex flex-1 justify-center">
          <Link
            to="/creer"
            aria-label="Créer"
            className="flex size-13 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>
        <Link to="/live" className={itemClass} activeProps={{ className: activeClass }}>
          <Radio className="size-6" strokeWidth={1.75} />
          <Label>LIVE</Label>
        </Link>
        <Link to="/profil" className={itemClass} activeProps={{ className: activeClass }}>
          <User className="size-6" strokeWidth={1.75} />
          <Label>Profil</Label>
        </Link>
      </div>
    </nav>
  );
}

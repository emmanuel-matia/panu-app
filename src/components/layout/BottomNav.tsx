import { Link } from "@tanstack/react-router";
import { Home, Plus, Search, Sparkles, User } from "lucide-react";
import type { ReactNode } from "react";

const itemClass =
  "group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors";
const activeClass = "text-gold";

function Label({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="text-[0.6875rem] font-medium">{children}</span>
      <span className="absolute bottom-0.5 h-0.5 w-8 rounded-full bg-gold opacity-0 transition-opacity group-data-[status=active]:opacity-100" />
    </>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-2 pb-[env(safe-area-inset-bottom)]">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className={itemClass}
          activeProps={{ className: activeClass }}
        >
          <Home className="size-6" strokeWidth={1.75} />
          <Label>Accueil</Label>
        </Link>
        <Link to="/explorer" className={itemClass} activeProps={{ className: activeClass }}>
          <Search className="size-6" strokeWidth={1.75} />
          <Label>Explorer</Label>
        </Link>
        <div className="flex flex-1 justify-center">
          <Link
            to="/creer"
            aria-label="Créer"
            className="flex size-13 items-center justify-center rounded-2xl bg-gold text-gold-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>
        <Link
          to="/creer/video"
          search={{ mode: "ai" }}
          className={itemClass}
          activeProps={{ className: activeClass }}
        >
          <Sparkles className="size-6 text-electric" strokeWidth={1.75} />
          <Label>Studio IA</Label>
        </Link>
        <Link to="/profil" className={itemClass} activeProps={{ className: activeClass }}>
          <User className="size-6" strokeWidth={1.75} />
          <Label>Profil</Label>
        </Link>
      </div>
    </nav>
  );
}

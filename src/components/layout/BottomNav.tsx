import { Link } from "@tanstack/react-router";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/explorer", label: "Explorer", icon: Search },
] as const;

const endItems = [
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/profil", label: "Profil", icon: User },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground transition-colors"
      activeProps={{ className: "text-foreground" }}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      <span className="text-[0.625rem] font-medium">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            to="/creer"
            aria-label="Créer"
            className="flex size-11 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow"
          >
            <Plus className="size-5" strokeWidth={2.25} />
          </Link>
        </div>
        {endItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

import { Link } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";

/** En-tête de l'accueil : logo PANU, recherche, notifications, profil. */
export function HomeHeader() {
  const { session, profile, loading } = useAuth();
  const avatar = useAvatarUrl(profile?.avatar_url);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="PANU — accueil">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-display text-lg font-bold text-primary-foreground shadow-glow">
            P
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">PANU</span>
        </Link>
        <Link
          to="/explorer"
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Rechercher sur PANU</span>
        </Link>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <Bell className="size-5" strokeWidth={1.75} />
        </Link>
        {loading ? (
          <span className="size-10 shrink-0 rounded-full border border-border" />
        ) : session ? (
          <Link to="/profil" aria-label="Mon profil" className="shrink-0 rounded-full">
            <ProfileAvatar url={avatar.data ?? null} alt={`Avatar de ${profile?.display_name ?? "mon profil"}`} size="sm" />
          </Link>
        ) : (
          <Link
            to="/connexion"
            className="shrink-0 rounded-full bg-electric px-3 py-2 text-xs font-semibold text-electric-foreground"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** En-tête de l'accueil : logo PANU, recherche, notifications, profil. */
export function HomeHeader() {
  const { session, profile, loading } = useAuth();
  const avatar = useAvatarUrl(profile?.avatar_url);
  const unreadQuery = useQuery({
    queryKey: ["unread-notifications", session?.user.id],
    enabled: Boolean(session),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("unread_notifications_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
  const unread = unreadQuery.data ?? 0;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="PANU — accueil">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-display text-lg font-bold text-primary-foreground shadow-glow">
            P
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground max-[360px]:hidden">PANU</span>
        </Link>
        <Link
          to="/decouvrir"
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-muted-foreground"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Rechercher</span>
        </Link>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <Bell className="size-5" strokeWidth={1.75} />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
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
            className="shrink-0 rounded-full bg-electric px-3 py-2 text-xs font-semibold text-electric-foreground max-[380px]:px-2.5"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Settings } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { PersonRow, useSignedAvatars } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — PANU" },
      {
        name: "description",
        content: "Suivez l'activité réelle de votre compte PANU : J'aime, commentaires, abonnés et parrainages.",
      },
      { property: "og:title", content: "Notifications — PANU" },
      { property: "og:description", content: "L'activité réelle de votre compte PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const LABEL: Record<string, string> = {
  like: "a aimé votre publication",
  comment: "a commenté votre publication",
  follow: "s'est abonné(e) à vous",
  referral: "s'est inscrit(e) avec votre invitation",
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_notifications");
      if (error) throw error;
      return data ?? [];
    },
  });
  const items = query.data ?? [];
  const avatars = useSignedAvatars(
    items.map((n) => ({
      id: n.actor_id,
      username: n.actor_username,
      display_name: n.actor_display_name,
      avatar_url: n.actor_avatar_url,
    })),
  );

  // Ouvrir la page marque les notifications comme lues.
  const hasUnread = items.some((n) => !n.read_at);
  useEffect(() => {
    if (!hasUnread) return;
    void supabase.rpc("mark_notifications_read").then(() => {
      void queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    });
  }, [hasUnread, queryClient]);

  return (
    <AppShell
      title="Notifications"
      subtitle="Activité"
      headerAction={
        <Link
          to="/parametres/$section"
          params={{ section: "notifications" }}
          aria-label="Réglages des notifications"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <Settings className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      {query.isPending ? (
        <div className="m-4 h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Les J'aime, commentaires, nouveaux abonnés et parrainages apparaîtront ici. Rien n'est simulé."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => (
              <PersonRow
                key={n.id}
                highlight={!n.read_at}
                person={{
                  id: n.actor_id,
                  username: n.actor_username,
                  display_name: n.actor_display_name,
                  avatar_url: n.actor_avatar_url,
                }}
                avatarUrl={n.actor_avatar_url ? (avatars[n.actor_avatar_url] ?? null) : null}
                subtitle={`${LABEL[n.type] ?? "activité"}${n.post_title ? ` « ${n.post_title} »` : ""} · ${timeAgo(n.created_at)}`}
                action={
                  n.post_id ? (
                    <Link to="/p/$postId" params={{ postId: n.post_id }} className="shrink-0 text-xs font-semibold text-accent">
                      Voir
                    </Link>
                  ) : undefined
                }
              />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

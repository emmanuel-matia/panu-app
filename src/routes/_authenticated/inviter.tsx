import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, MessageCircle, MessageSquare, Send, Share2, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PersonRow, useSignedAvatars } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { copyText, nativeShare, shareUrl, type ShareChannel } from "@/lib/invite";
import { referralLink } from "@/lib/prefs";

export const Route = createFileRoute("/_authenticated/inviter")({
  head: () => ({
    meta: [
      { title: "Inviter des amis — PANU" },
      { name: "description", content: "Partagez votre lien d'invitation et votre code de parrainage PANU." },
      { property: "og:title", content: "Inviter des amis — PANU" },
      { property: "og:description", content: "Faites connaître PANU avec votre lien personnel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

const INVITE_TEXT = "Rejoins-moi sur PANU, la plateforme africaine numérique pour créer, partager et gagner.";

function InvitePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const code = useQuery({
    queryKey: ["referral-code", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_referral_code");
      if (error) throw error;
      return data;
    },
  });
  const stats = useQuery({
    queryKey: ["referral-stats", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [shares, referred] = await Promise.all([
        supabase.from("referral_codes").select("shares_count").eq("user_id", user!.id).maybeSingle(),
        supabase.rpc("list_my_referrals"),
      ]);
      if (referred.error) throw referred.error;
      return { shares: shares.data?.shares_count ?? 0, referred: referred.data ?? [] };
    },
  });
  const referred = stats.data?.referred ?? [];
  const avatars = useSignedAvatars(referred);
  const link = code.data ? referralLink(window.location.origin, code.data) : "";

  async function recordShare() {
    await supabase.rpc("record_invite_share");
    void queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
  }

  async function copy() {
    if (!link) return;
    if (await copyText(link)) {
      toast.success("Lien copié");
      void recordShare();
    } else toast.error("Impossible de copier le lien.");
  }

  async function copyCode() {
    if (code.data && (await copyText(code.data))) toast.success("Code copié");
  }

  async function invite() {
    if (!link) return;
    if (await nativeShare({ title: "Rejoins PANU", text: INVITE_TEXT, url: link })) void recordShare();
    else await copy();
  }

  function open(channel: ShareChannel) {
    if (!link) return;
    void recordShare();
    window.open(shareUrl(channel, INVITE_TEXT, link), "_blank", "noopener,noreferrer");
  }

  const channels: { id: ShareChannel; label: string; icon: typeof Send }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { id: "sms", label: "SMS", icon: MessageSquare },
    { id: "messenger", label: "Messenger", icon: Send },
    { id: "telegram", label: "Telegram", icon: Send },
  ];

  return (
    <AppShell
      title="Inviter des amis"
      headerAction={
        <Link to="/profil" aria-label="Retour au profil" className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Votre code de parrainage</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-display text-2xl font-bold tracking-widest text-foreground">
              {code.isPending ? "…" : (code.data ?? "—")}
            </p>
            <button type="button" onClick={() => void copyCode()} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-surface-foreground">
              Copier le code
            </button>
          </div>
          <p className="mt-3 break-all text-xs text-muted-foreground">{link || "Génération du lien…"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void copy()} disabled={!link} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold text-surface-foreground">
              <Copy className="size-4" /> Copier le lien
            </button>
            <button type="button" onClick={() => void invite()} disabled={!link} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground">
              <Share2 className="size-4" /> Inviter mes amis
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Partager avec</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Vous choisissez vous-même la personne dans l'application ouverte : PANU n'envoie jamais de message à votre place.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <button key={c.id} type="button" disabled={!link} onClick={() => open(c.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-surface-foreground">
                <c.icon className="size-4" /> {c.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-display text-xl font-semibold text-foreground">{stats.data?.shares ?? 0}</p>
            <p className="text-xs text-muted-foreground">Invitations partagées</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-display text-xl font-semibold text-foreground">{referred.length}</p>
            <p className="text-xs text-muted-foreground">Inscriptions confirmées</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <h2 className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-foreground">
            <Users className="size-4" /> Personnes parrainées
          </h2>
          {referred.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Personne ne s'est encore inscrit avec votre lien ou votre code.</p>
          ) : (
            <ul className="divide-y divide-border">
              {referred.map((p) => (
                <PersonRow key={p.id} person={p} avatarUrl={p.avatar_url ? (avatars[p.avatar_url] ?? null) : null} subtitle={new Date(p.created_at).toLocaleDateString("fr-FR")} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

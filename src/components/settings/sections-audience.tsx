import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { FollowToggle } from "@/components/profile/FollowToggle";
import { PersonRow, useSignedAvatars } from "@/components/profile/PersonRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Ban } from "lucide-react";

import { Card, Note, SelectRow, ToggleRow, useSave } from "./controls";
import { AUDIENCE_OPTIONS } from "./sections-prefs";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** Enregistre une colonne du profil de l'utilisateur et confirme à l'écran. */
export function useProfileSave() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Réglage enregistré");
      await refreshProfile();
      void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => toast.error("Impossible d'enregistrer ce réglage."),
  });
}

export function LockProfile() {
  const { profile } = useAuth();
  const save = useProfileSave();
  return (
    <Card>
      <ToggleRow label="Verrouiller mon profil" hint="Vos publications ne sont alors visibles que par vos abonnés. Vous pouvez revenir à un profil public à tout moment." checked={profile?.is_locked ?? false} onChange={(v) => save.mutate({ is_locked: v })} />
      <Note>Votre nom, votre photo et votre identifiant restent visibles pour que l'on puisse vous retrouver.</Note>
    </Card>
  );
}

export function ProfileInfoVisibility() {
  const { prefs, save } = useSave();
  return (
    <>
      <Card title="Informations visibles publiquement">
        <ToggleRow label="Site web" checked={prefs.show_website} onChange={(v) => save({ prefs: { show_website: v } })} />
        <ToggleRow label="Ville et pays" checked={prefs.show_location} onChange={(v) => save({ prefs: { show_location: v } })} />
        <ToggleRow label="Liens de réseaux sociaux" checked={prefs.show_social} onChange={(v) => save({ prefs: { show_social: v } })} />
        <Note>Votre e-mail et votre numéro de téléphone ne sont jamais affichés.</Note>
      </Card>
      <Card>
        <Link to="/profil/modifier" className="text-sm font-medium text-accent underline">Modifier ma biographie, ma localisation et mon site web</Link>
      </Card>
    </>
  );
}

export function ProfessionalMode() {
  const { profile } = useAuth();
  const save = useProfileSave();
  return (
    <>
      <Card>
        <ToggleRow label="Activer le profil professionnel" hint="Affiche un badge « Profil professionnel » sur votre profil." checked={profile?.is_professional ?? false} onChange={(v) => save.mutate({ is_professional: v })} />
      </Card>
      <Card title="Outils">
        <Link to="/tableau-de-bord" className="block text-sm font-medium text-accent underline">Tableau de bord créateur et statistiques</Link>
        <Note>Les outils de monétisation ne sont pas encore ouverts.</Note>
      </Card>
    </>
  );
}

export function FindMe() {
  const { profile } = useAuth();
  const { prefs, save } = useSave();
  const profileSave = useProfileSave();
  return (
    <>
      <Card title="Recherche">
        <ToggleRow label="Apparaître dans la recherche par nom et par @identifiant" checked={profile?.searchable ?? true} onChange={(v) => profileSave.mutate({ searchable: v })} />
        <ToggleRow label="Suggérer mon profil à d'autres personnes" checked={prefs.profile_suggestions} pending onChange={(v) => save({ prefs: { profile_suggestions: v } })} />
      </Card>
      <Card title="Numéro de téléphone">
        <Note>Votre numéro est privé. Vous décidez s'il permet à vos contacts de vous retrouver.</Note>
        <Link to="/amis" className="text-sm font-medium text-accent underline">Gérer mon numéro et retrouver mes amis</Link>
      </Card>
      <Card title="Messages et invitations">
        <SelectRow label="Qui peut m'envoyer une demande de message" value={prefs.message_requests} pending options={AUDIENCE_OPTIONS} onChange={(v) => save({ prefs: { message_requests: v } })} />
        <Note>La messagerie n'est pas encore ouverte.</Note>
        <Link to="/inviter" className="text-sm font-medium text-accent underline">Mes invitations et mon code de parrainage</Link>
      </Card>
    </>
  );
}

export function PostsAudience() {
  const { prefs, save } = useSave();
  return (
    <>
      <Card title="Nouvelles publications">
        <Note>La visibilité et les commentaires par défaut se règlent dans « Paramètres d'audience par défaut ».</Note>
        <Link to="/parametres/$section" params={{ section: "audience-par-defaut" }} className="text-sm font-medium text-accent underline">Ouvrir les paramètres d'audience par défaut</Link>
      </Card>
      <Card title="Mentions et partages">
        <SelectRow label="Qui peut me mentionner" value={prefs.allow_mentions} pending options={AUDIENCE_OPTIONS} onChange={(v) => save({ prefs: { allow_mentions: v } })} />
        <ToggleRow label="Autoriser le partage de mes publications" checked={prefs.allow_sharing} pending onChange={(v) => save({ prefs: { allow_sharing: v } })} />
      </Card>
      <Card title="Gérer mes publications">
        <Link to="/profil" className="block text-sm font-medium text-accent underline">Modifier ou supprimer mes publications depuis mon profil</Link>
        <Link to="/parametres/$section" params={{ section: "historique" }} className="block text-sm font-medium text-accent underline">Historique d'activité</Link>
      </Card>
    </>
  );
}

export function StoriesAudience() {
  const { prefs, save } = useSave();
  return (
    <>
      <Card>
        <Note>Vos stories sont visibles uniquement par vous et par vos abonnés, pendant 24 heures. Pour retirer quelqu'un, bloquez-le : il ne vous suit plus et ne peut plus vous suivre.</Note>
      </Card>
      <Card title="Réponses, partages et archives">
        <SelectRow label="Qui peut répondre à mes stories" value={prefs.story_replies} pending options={AUDIENCE_OPTIONS} onChange={(v) => save({ prefs: { story_replies: v } })} />
        <ToggleRow label="Autoriser le partage de mes stories" checked={prefs.story_sharing} pending onChange={(v) => save({ prefs: { story_sharing: v } })} />
        <ToggleRow label="Archiver mes stories" checked={prefs.story_archive} pending onChange={(v) => save({ prefs: { story_archive: v } })} />
      </Card>
    </>
  );
}

export function ReelsAudience() {
  const { settings, prefs, save } = useSave();
  return (
    <Card>
      <Note>Un Reel est une vidéo de 90 secondes ou moins. Il suit la visibilité de vos publications.</Note>
      <ToggleRow label="Autoriser les commentaires" checked={prefs.default_allow_comments} onChange={(v) => save({ prefs: { default_allow_comments: v } })} />
      <ToggleRow label="Autoriser le remix et la réutilisation" checked={settings.default_allow_remix} onChange={(v) => save({ default_allow_remix: v })} />
      <ToggleRow label="Autoriser le partage" checked={prefs.allow_sharing} pending onChange={(v) => save({ prefs: { allow_sharing: v } })} />
    </Card>
  );
}

export function FollowersSettings() {
  const { profile } = useAuth();
  const save = useProfileSave();
  return (
    <>
      <Card title="Qui peut me suivre">
        <SelectRow label="Nouveaux abonnés" value={profile?.follow_policy ?? "everyone"} options={[{ value: "everyone", label: "Tout le monde" }, { value: "nobody", label: "Personne" }]} onChange={(v) => save.mutate({ follow_policy: v })} hint="Vos abonnés actuels ne sont pas affectés." />
      </Card>
      <Card title="Mes abonnés">
        <Link to="/personnes" search={{ onglet: "abonnes" }} className="block text-sm font-medium text-accent underline">Voir mes abonnés</Link>
        <Link to="/personnes" search={{ onglet: "abonnements" }} className="block text-sm font-medium text-accent underline">Voir mes abonnements</Link>
        <Note>Pour retirer un abonné, bloquez-le puis débloquez-le si vous le souhaitez.</Note>
      </Card>
    </>
  );
}

export function TaggingSettings() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <SelectRow label="Qui peut m'identifier ou me mentionner" value={prefs.allow_mentions} pending options={AUDIENCE_OPTIONS} onChange={(v) => save({ prefs: { allow_mentions: v } })} />
      <ToggleRow label="Approuver les identifications avant affichage" checked={prefs.tag_approval} pending onChange={(v) => save({ prefs: { tag_approval: v } })} />
      <Note>Les identifications et mentions n'existent pas encore dans PANU.</Note>
    </Card>
  );
}

export function BlockedList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_blocked_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = query.data ?? [];
  const avatars = useSignedAvatars(rows);
  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocks").delete().eq("blocker_id", user!.id).eq("blocked_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte débloqué");
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      void queryClient.invalidateQueries({ queryKey: ["relation"] });
    },
    onError: () => toast.error("Déblocage impossible."),
  });
  return (
    <>
      <Card>
        <Note>Un compte bloqué ne peut plus vous suivre ni commenter vos publications, et vous ne recevez plus ses notifications. Bloquer supprime aussi vos abonnements dans les deux sens. Pour bloquer quelqu'un, ouvrez son profil et touchez « Bloquer ».</Note>
      </Card>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {query.isPending ? (
          <div className="h-16 animate-pulse" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Ban} title="Aucun compte bloqué" description="Les comptes que vous bloquez apparaissent ici." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                avatarUrl={p.avatar_url ? (avatars[p.avatar_url] ?? null) : null}
                action={
                  <button type="button" disabled={unblock.isPending} onClick={() => unblock.mutate(p.id)} className="h-9 shrink-0 rounded-full border border-border px-4 text-xs font-semibold text-surface-foreground">
                    Débloquer
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function OnlineStatus() {
  const { profile } = useAuth();
  const save = useProfileSave();
  return (
    <Card>
      <ToggleRow label="Afficher mon statut en ligne" hint="Les autres voient « en ligne » quand vous utilisez PANU. Désactivé, ils ne voient rien et votre dernière activité reste masquée." checked={profile?.show_online ?? true} onChange={(v) => save.mutate({ show_online: v })} />
    </Card>
  );
}

export { FollowToggle };

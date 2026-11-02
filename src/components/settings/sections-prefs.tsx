import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ActionButton } from "@/components/common/ActionButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { POST_CATEGORIES } from "@/lib/categories";
import {
  MAX_TAB_EXTRAS,
  sanitizeTabExtras,
  TAB_EXTRA_OPTIONS,
  type Audience,
  type TabExtra,
  type Visibility,
} from "@/lib/prefs";

import { Card, Note, SelectRow, ToggleRow, useSave } from "./controls";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "everyone", label: "Tout le monde" },
  { value: "followers", label: "Mes abonnés" },
  { value: "nobody", label: "Personne" },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Abonnés uniquement" },
  { value: "private", label: "Moi uniquement" },
];

export function ContentPrefs() {
  const { prefs, save } = useSave();
  const hidden = new Set(prefs.hidden_categories);
  return (
    <>
      <Card title="Types de contenus affichés dans le fil">
        <ToggleRow label="Vidéos" checked={prefs.show_videos} onChange={(v) => save({ prefs: { show_videos: v } })} />
        <ToggleRow label="Images" checked={prefs.show_images} onChange={(v) => save({ prefs: { show_images: v } })} />
        <ToggleRow label="Audio" checked={prefs.show_audio} onChange={(v) => save({ prefs: { show_audio: v } })} />
        <Note>Vos propres publications restent toujours visibles sur votre profil.</Note>
      </Card>
      <Card title="Catégories masquées">
        <div className="flex flex-wrap gap-2">
          {POST_CATEGORIES.map((c) => {
            const off = hidden.has(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={off}
                onClick={() => {
                  const next = new Set(hidden);
                  if (off) next.delete(c);
                  else next.add(c);
                  save({ prefs: { hidden_categories: [...next] } });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${off ? "border-transparent bg-destructive text-destructive-foreground" : "border-border text-surface-foreground"}`}
              >
                {off ? "Masqué · " : ""}
                {c}
              </button>
            );
          })}
        </div>
        <Note>Les publications de ces catégories ne s'affichent plus dans votre fil.</Note>
      </Card>
      <Card title="Recommandations et sensibilité">
        <ToggleRow label="Recommandations personnalisées" checked={prefs.recommendations} pending onChange={(v) => save({ prefs: { recommendations: v } })} />
        <ToggleRow label="Personnaliser les tendances" checked={prefs.personalized_trends} pending onChange={(v) => save({ prefs: { personalized_trends: v } })} />
        <SelectRow label="Contenus sensibles" value={prefs.sensitive_content} pending options={[{ value: "hide", label: "Masquer" }, { value: "show", label: "Afficher" }]} onChange={(v) => save({ prefs: { sensitive_content: v } })} />
        <Note>PANU ne classe pas encore les contenus par sensibilité : ces choix seront appliqués dès que ce classement existera.</Note>
      </Card>
    </>
  );
}

export function ReactionPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <ToggleRow label="Afficher le nombre de J'aime" hint="Masque les compteurs de J'aime sur les publications du fil." checked={prefs.show_reaction_counts} onChange={(v) => save({ prefs: { show_reaction_counts: v } })} />
      <Note>PANU propose une seule réaction : le J'aime.</Note>
    </Card>
  );
}

export function NotificationPrefs() {
  const { settings, prefs, save } = useSave();
  return (
    <>
      <Card title="Dans l'application">
        <ToggleRow label="Nouveaux abonnés" checked={settings.notify_follows} onChange={(v) => save({ notify_follows: v })} />
        <ToggleRow label="J'aime et réactions" checked={settings.notify_likes} onChange={(v) => save({ notify_likes: v })} />
        <ToggleRow label="Commentaires" checked={settings.notify_comments} onChange={(v) => save({ notify_comments: v })} />
        <ToggleRow label="Invitations et parrainages" checked={prefs.notify_invitations} onChange={(v) => save({ prefs: { notify_invitations: v } })} />
      </Card>
      <Card title="Autres catégories">
        <ToggleRow label="Messages" checked={settings.notify_messages} pending onChange={(v) => save({ notify_messages: v })} />
        <ToggleRow label="Partages" checked={prefs.notify_shares} pending onChange={(v) => save({ prefs: { notify_shares: v } })} />
        <ToggleRow label="Stories" checked={prefs.notify_stories} pending onChange={(v) => save({ prefs: { notify_stories: v } })} />
        <ToggleRow label="Lives" checked={prefs.notify_lives} pending onChange={(v) => save({ prefs: { notify_lives: v } })} />
        <ToggleRow label="Activités du Studio IA" checked={prefs.notify_ai} pending onChange={(v) => save({ prefs: { notify_ai: v } })} />
        <ToggleRow label="Paiements et abonnements" checked={prefs.notify_payments} pending onChange={(v) => save({ prefs: { notify_payments: v } })} />
        <Note>Ces événements n'existent pas encore dans PANU : votre choix est conservé pour quand ils seront disponibles.</Note>
      </Card>
      <Card title="Canaux">
        <Note>Seules les notifications dans l'application sont disponibles pour le moment. Les notifications push et par e-mail ne sont pas encore proposées.</Note>
        <Link to="/notifications" className="text-sm font-medium text-accent underline">Ouvrir mes notifications</Link>
      </Card>
    </>
  );
}

export function AccessibilityPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <SelectRow label="Taille du texte" value={prefs.text_size} options={[{ value: "normal", label: "Normale" }, { value: "large", label: "Grande" }, { value: "xlarge", label: "Très grande" }]} onChange={(v) => save({ prefs: { text_size: v } })} />
      <ToggleRow label="Contraste élevé" checked={prefs.high_contrast} onChange={(v) => save({ prefs: { high_contrast: v } })} />
      <ToggleRow label="Réduire les animations" checked={prefs.reduce_motion} onChange={(v) => save({ prefs: { reduce_motion: v } })} />
      <ToggleRow label="Sous-titres" hint="Appliqués aux vidéos qui en proposent." checked={prefs.captions} pending onChange={(v) => save({ prefs: { captions: v } })} />
    </Card>
  );
}

export function TabBarPrefs() {
  const { prefs, save } = useSave();
  const LABELS: Record<TabExtra, string> = { messages: "Messages", notifications: "Notifications", marketplace: "Marketplace", formations: "Formations" };
  function toggle(id: TabExtra) {
    const on = prefs.tab_extras.includes(id);
    if (!on && prefs.tab_extras.length >= MAX_TAB_EXTRAS) {
      toast.error(`Vous pouvez ajouter ${MAX_TAB_EXTRAS} raccourcis au maximum.`);
      return;
    }
    const next = on ? prefs.tab_extras.filter((t) => t !== id) : [...prefs.tab_extras, id];
    save({ prefs: { tab_extras: sanitizeTabExtras(next) } });
  }
  function move(id: TabExtra, dir: -1 | 1) {
    const list = [...prefs.tab_extras];
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    save({ prefs: { tab_extras: list } });
  }
  return (
    <>
      <Card title="Accès essentiels (toujours visibles)">
        <p className="text-sm text-surface-foreground">Accueil · Explorer · Créer · Live · Profil</p>
      </Card>
      <Card title="Raccourcis supplémentaires (2 maximum)">
        {TAB_EXTRA_OPTIONS.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <ToggleRow label={LABELS[id]} checked={prefs.tab_extras.includes(id)} onChange={() => toggle(id)} />
            {prefs.tab_extras.includes(id) ? (
              <span className="flex gap-1">
                <button type="button" aria-label={`Monter ${LABELS[id]}`} onClick={() => move(id, -1)} className="size-8 rounded-full border border-border text-xs">↑</button>
                <button type="button" aria-label={`Descendre ${LABELS[id]}`} onClick={() => move(id, 1)} className="size-8 rounded-full border border-border text-xs">↓</button>
              </span>
            ) : null}
          </div>
        ))}
        <Note>L'ordre choisi est celui de la barre, de gauche à droite après Accueil et Explorer.</Note>
      </Card>
    </>
  );
}

export function LanguagePrefs() {
  const { settings, prefs, save } = useSave();
  return (
    <Card>
      <SelectRow label="Langue de l'application" value={settings.language} options={[{ value: "fr", label: "Français" }, { value: "en", label: "English" }]} onChange={(v) => save({ language: v })} hint="L'interface est aujourd'hui disponible en français ; l'anglais sera ajouté." pending={settings.language === "en"} />
      <SelectRow label="Région" value={prefs.region} pending options={[{ value: "CD", label: "RD Congo" }, { value: "CG", label: "Congo-Brazzaville" }, { value: "CM", label: "Cameroun" }, { value: "CI", label: "Côte d'Ivoire" }, { value: "SN", label: "Sénégal" }, { value: "NG", label: "Nigéria" }, { value: "FR", label: "France" }, { value: "BE", label: "Belgique" }]} onChange={(v) => save({ prefs: { region: v } })} />
      <SelectRow label="Format de date" value={prefs.date_format} pending options={[{ value: "dmy", label: "JJ/MM/AAAA" }, { value: "mdy", label: "MM/JJ/AAAA" }, { value: "ymd", label: "AAAA-MM-JJ" }]} onChange={(v) => save({ prefs: { date_format: v } })} />
      <SelectRow label="Format de l'heure" value={prefs.time_format} pending options={[{ value: "24h", label: "24 heures" }, { value: "12h", label: "12 heures" }]} onChange={(v) => save({ prefs: { time_format: v } })} />
    </Card>
  );
}

export function MediaPrefs() {
  const { prefs, save } = useSave();
  return (
    <>
      <Card title="Lecture">
        <SelectRow label="Lecture automatique des vidéos" value={prefs.autoplay} options={[{ value: "always", label: "Toujours" }, { value: "wifi", label: "Wi-Fi uniquement" }, { value: "never", label: "Jamais" }]} onChange={(v) => save({ prefs: { autoplay: v } })} hint="« Wi-Fi uniquement » ne lance la vidéo que si le téléphone confirme une connexion Wi-Fi." />
        <ToggleRow label="Démarrer les vidéos sans le son" checked={prefs.start_muted} onChange={(v) => save({ prefs: { start_muted: v } })} />
        <ToggleRow label="Économie des données mobiles" hint="Désactive la lecture automatique." checked={prefs.data_saver} onChange={(v) => save({ prefs: { data_saver: v } })} />
        <SelectRow label="Qualité de lecture" value={prefs.video_quality} pending options={[{ value: "auto", label: "Automatique" }, { value: "high", label: "Haute" }, { value: "data_saver", label: "Économie de données" }]} onChange={(v) => save({ prefs: { video_quality: v } })} />
      </Card>
      <Card title="Import et téléchargements">
        <SelectRow label="Qualité d'importation des photos et vidéos" value={prefs.upload_quality} pending options={[{ value: "high", label: "Haute" }, { value: "standard", label: "Standard" }]} onChange={(v) => save({ prefs: { upload_quality: v } })} />
        <ToggleRow label="Autoriser le téléchargement de mes créations" checked={prefs.allow_downloads} pending onChange={(v) => save({ prefs: { allow_downloads: v } })} />
      </Card>
    </>
  );
}

export function UsagePrefs() {
  const { user } = useAuth();
  const { prefs, save } = useSave();
  const usage = useQuery({
    queryKey: ["usage", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data, error } = await supabase
        .from("usage_daily")
        .select("day, seconds")
        .gte("day", since.toISOString().slice(0, 10))
        .order("day", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = usage.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todaySec = rows.find((r) => r.day === today)?.seconds ?? 0;
  const weekSec = rows.reduce((n, r) => n + r.seconds, 0);
  const fmt = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 3600) > 0 ? `${Math.floor(s / 3600)} h ` : ""}${Math.floor((s % 3600) / 60)} min`);
  const max = Math.max(1, ...rows.map((r) => r.seconds));
  const minutes = [0, 15, 30, 60, 120];
  return (
    <>
      <Card title="Votre temps sur PANU">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="font-display text-xl text-foreground">{fmt(todaySec)}</p><p className="text-xs text-muted-foreground">Aujourd'hui</p></div>
          <div><p className="font-display text-xl text-foreground">{fmt(weekSec)}</p><p className="text-xs text-muted-foreground">7 derniers jours</p></div>
        </div>
        {rows.length > 0 ? (
          <div className="flex h-16 items-end gap-1" role="img" aria-label="Temps par jour">
            {rows.map((r) => (
              <div key={r.day} title={`${r.day} : ${fmt(r.seconds)}`} className="flex-1 rounded-t bg-brand" style={{ height: `${Math.max(4, (r.seconds / max) * 100)}%` }} />
            ))}
          </div>
        ) : null}
        <Note>Le temps est compté uniquement quand PANU est ouvert et visible, depuis l'activation de cette fonction.</Note>
      </Card>
      <Card title="Rappels">
        <SelectRow label="Me prévenir après (temps total du jour)" value={String(prefs.usage_reminder_minutes)} options={minutes.map((m) => ({ value: String(m), label: m === 0 ? "Désactivé" : `${m} min` }))} onChange={(v) => save({ prefs: { usage_reminder_minutes: Number(v) } })} />
        <SelectRow label="Me proposer une pause toutes les" value={String(prefs.break_reminder_minutes)} options={[0, 20, 30, 45, 60].map((m) => ({ value: String(m), label: m === 0 ? "Désactivé" : `${m} min` }))} onChange={(v) => save({ prefs: { break_reminder_minutes: Number(v) } })} />
      </Card>
    </>
  );
}

export function BrowserPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <ToggleRow label="Ouvrir les liens dans l'application" checked={prefs.open_links_in_app} pending onChange={(v) => save({ prefs: { open_links_in_app: v } })} />
      <Note>Les liens externes s'ouvrent aujourd'hui dans un nouvel onglet du navigateur de votre téléphone. PANU ne conserve pas d'historique de navigation interne.</Note>
    </Card>
  );
}

export function ThemePrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <SelectRow label="Apparence" value={prefs.theme} options={[{ value: "dark", label: "Mode sombre" }, { value: "light", label: "Mode clair" }, { value: "system", label: "Automatique (selon l'appareil)" }]} onChange={(v) => save({ prefs: { theme: v } })} />
    </Card>
  );
}

export function DashboardsPrefs() {
  return (
    <Card>
      <Link to="/tableau-de-bord" className="block text-sm font-medium text-accent underline">Statistiques personnelles et créateur</Link>
      <Note>Les statistiques de monétisation ne sont pas encore disponibles.</Note>
    </Card>
  );
}

export function GalleryPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <ToggleRow label="Suggestions de partage depuis la galerie" checked={prefs.gallery_suggestions} pending onChange={(v) => save({ prefs: { gallery_suggestions: v } })} />
      <Note>PANU n'accède jamais à votre galerie sans que vous choisissiez vous-même un fichier. Aucune suggestion n'est proposée aujourd'hui.</Note>
    </Card>
  );
}

export function AdsPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <ToggleRow label="Autoriser des publicités sur mes contenus" checked={prefs.ads_on_content} pending onChange={(v) => save({ prefs: { ads_on_content: v } })} />
      <Note>PANU n'affiche pas de publicité et la monétisation publicitaire n'est pas ouverte : aucune information de revenu n'est disponible.</Note>
    </Card>
  );
}

export function EarlyAccessPrefs() {
  const { prefs, save } = useSave();
  return (
    <Card>
      <ToggleRow label="Participer aux tests de nouveautés" checked={prefs.early_access} onChange={(v) => save({ prefs: { early_access: v } })} />
      <Note>Aucune fonctionnalité expérimentale n'est en test pour le moment. Si vous participez, vous serez prévenu à l'ouverture des prochains tests.</Note>
    </Card>
  );
}

export function DefaultAudiencePrefs() {
  const { settings, prefs, save } = useSave();
  return (
    <>
      <Card title="Nouvelles publications">
        <SelectRow label="Qui peut voir mes publications" value={prefs.default_post_visibility} options={VISIBILITY_OPTIONS} onChange={(v) => save({ prefs: { default_post_visibility: v } })} hint="Appliqué à chaque nouvelle publication ; modifiable ensuite." />
        <ToggleRow label="Autoriser les commentaires" checked={prefs.default_allow_comments} onChange={(v) => save({ prefs: { default_allow_comments: v } })} />
        <ToggleRow label="Autoriser le remix des vidéos" checked={settings.default_allow_remix} onChange={(v) => save({ default_allow_remix: v })} />
        <ToggleRow label="Autoriser le partage de mes contenus" checked={prefs.allow_sharing} pending onChange={(v) => save({ prefs: { allow_sharing: v } })} />
      </Card>
      <Card title="Stories">
        <Note>Vos stories sont visibles par vous et par vos abonnés pendant 24 heures.</Note>
      </Card>
    </>
  );
}

export { AUDIENCE_OPTIONS, VISIBILITY_OPTIONS };
export { ActionButton };

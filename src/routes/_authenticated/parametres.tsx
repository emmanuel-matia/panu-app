import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  History,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import {
  GROUP_LABEL,
  searchSections,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@/lib/settings-config";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres et confidentialité — PANU" },
      {
        name: "description",
        content: "Compte, abonnements, préférences, audience, paiements, activité et mentions légales de PANU.",
      },
      { property: "og:title", content: "Paramètres et confidentialité — PANU" },
      { property: "og:description", content: "Tous les réglages de votre compte PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsHub,
});

const GROUP_ICON: Record<SettingsGroup, typeof UserCog> = {
  compte: UserCog,
  abonnements: Sparkles,
  outils: Wrench,
  preferences: SlidersHorizontal,
  audience: Eye,
  paiements: CreditCard,
  activite: History,
  standards: FileText,
};

const GROUP_ORDER: SettingsGroup[] = ["compte", "abonnements", "outils", "preferences", "audience", "paiements", "activite", "standards"];

function SectionLink({ section }: { section: SettingsSection }) {
  const Icon = GROUP_ICON[section.group];
  const body = (
    <>
      <Icon className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-surface-foreground">{section.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{section.description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className = "flex items-center gap-3 px-4 py-3 hover:bg-muted";
  return section.to ? (
    <Link to={section.to} className={className}>{body}</Link>
  ) : (
    <Link to="/parametres/$section" params={{ section: section.id }} className={className}>{body}</Link>
  );
}

function SettingsHub() {
  const { profile } = useAuth();
  const avatar = useAvatarUrl(profile?.avatar_url);
  const [q, setQ] = useState("");
  const results = useMemo(() => searchSections(q), [q]);
  const searching = q.trim().length > 0;

  return (
    <AppShell title="Paramètres et confidentialité">
      <div className="space-y-5 px-4 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un paramètre"
            aria-label="Rechercher un paramètre"
            className="h-11 w-full rounded-full border border-border bg-surface pr-4 pl-9 text-sm text-foreground"
          />
        </div>

        {searching ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucun paramètre ne correspond à « {q} ».</p>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((s) => (
                  <li key={s.id}><SectionLink section={s} /></li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {profile ? (
              <Link to="/profil" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <ProfileAvatar url={avatar.data ?? null} alt="Votre photo de profil" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{profile.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{profile.username} · Voir mon profil</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <Link to="/tableau-de-bord" className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 text-xs font-medium text-surface-foreground">
                <BarChart3 className="size-5 text-accent" /> Tableau de bord
              </Link>
              <Link to="/personnes" search={{ onglet: "abonnes" }} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 text-xs font-medium text-surface-foreground">
                <Users className="size-5 text-accent" /> Communauté
              </Link>
              <Link to="/inviter" className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 text-xs font-medium text-surface-foreground">
                <Sparkles className="size-5 text-gold" /> Inviter
              </Link>
            </div>
            {GROUP_ORDER.map((g) => (
              <section key={g}>
                <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{GROUP_LABEL[g]}</h2>
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {SETTINGS_SECTIONS.filter((s) => s.group === g).map((s) => (
                    <li key={s.id}><SectionLink section={s} /></li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}

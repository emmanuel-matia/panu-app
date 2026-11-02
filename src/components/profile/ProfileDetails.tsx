import { Link } from "@tanstack/react-router";
import { BadgeCheck, Briefcase, CalendarDays, Globe, Lock, MapPin } from "lucide-react";

import { socialLabel } from "@/lib/social";

export function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Lieu, site web, réseaux et compteurs affichés sous le nom (profil personnel et profil public). */
export function ProfileDetails({
  username,
  createdAt,
  location,
  website,
  socialLinks,
  postsCount,
  followersCount,
  followingCount,
  isFounder,
  isProfessional,
  isLocked,
  online,
  countsLinkable,
}: {
  username: string;
  createdAt: string;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFounder?: boolean;
  isProfessional?: boolean;
  isLocked?: boolean;
  online?: boolean | undefined;
  countsLinkable: boolean;
}) {
  const links = Object.entries(socialLinks);
  return (
    <div className="mt-3 space-y-2">
      {isFounder || isProfessional || isLocked || online ? (
        <div className="flex flex-wrap gap-2">
          {isFounder ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[0.6875rem] font-bold text-gold-foreground">
              <BadgeCheck className="size-3.5" /> Fondateur de PANU
            </span>
          ) : null}
          {isProfessional ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
              <Briefcase className="size-3.5" /> Profil professionnel
            </span>
          ) : null}
          {online ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-accent" /> En ligne
            </span>
          ) : null}
          {isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
              <Lock className="size-3.5" /> Profil verrouillé
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" strokeWidth={1.75} /> {location}
          </span>
        ) : null}
        {website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 text-accent underline"
          >
            <Globe className="size-3.5" strokeWidth={1.75} /> {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" strokeWidth={1.75} /> Membre depuis {formatJoined(createdAt)}
        </span>
      </div>
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {links.map(([key, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-surface-foreground hover:bg-muted"
            >
              {socialLabel(key)}
            </a>
          ))}
        </div>
      ) : null}
      <div className="flex gap-5 pt-1 text-sm" aria-live="polite">
        <span>
          <strong className="font-display text-foreground">{postsCount}</strong>{" "}
          <span className="text-muted-foreground">{postsCount > 1 ? "publications" : "publication"}</span>
        </span>
        {countsLinkable ? (
          <>
            <Link to="/personnes" search={{ onglet: "abonnes" }}>
              <strong className="font-display text-foreground">{followersCount}</strong>{" "}
              <span className="text-muted-foreground">{followersCount > 1 ? "abonnés" : "abonné"}</span>
            </Link>
            <Link to="/personnes" search={{ onglet: "abonnements" }}>
              <strong className="font-display text-foreground">{followingCount}</strong>{" "}
              <span className="text-muted-foreground">abonnements</span>
            </Link>
          </>
        ) : (
          <>
            <span>
              <strong className="font-display text-foreground">{followersCount}</strong>{" "}
              <span className="text-muted-foreground">{followersCount > 1 ? "abonnés" : "abonné"}</span>
            </span>
            <span>
              <strong className="font-display text-foreground">{followingCount}</strong>{" "}
              <span className="text-muted-foreground">abonnements</span>
            </span>
          </>
        )}
      </div>
      <span className="sr-only">@{username}</span>
    </div>
  );
}

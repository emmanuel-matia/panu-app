import { Link } from "@tanstack/react-router";
import { Camera, Clapperboard, Image as ImageIcon, Music, Sparkles, type LucideIcon } from "lucide-react";

import { templateCover } from "@/lib/templates";
import { costLabel, usesLabel, type TemplateCard, type TemplateKind } from "@/lib/templates-rules";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<TemplateKind, LucideIcon> = { video: Clapperboard, image: ImageIcon, music: Music };

export function TemplateCover({
  template,
  className,
  eager = false,
}: {
  template: Pick<TemplateCard, "slug" | "coverUrl" | "kind" | "title">;
  className?: string;
  eager?: boolean;
}) {
  const src = templateCover(template.slug, template.coverUrl);
  const Icon = KIND_ICON[template.kind] ?? Sparkles;
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-brand", className)}>
        <Icon className="size-10 text-primary-foreground/90" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Illustration du modèle ${template.title}`}
      width={768}
      height={960}
      loading={eager ? "eager" : "lazy"}
      className={cn("object-cover", className)}
    />
  );
}

/** Carte d'un modèle : illustration, titre, type, coût et compteur réel d'utilisations. */
export function TemplateTile({ template, size = "md" }: { template: TemplateCard; size?: "sm" | "md" }) {
  const Icon = KIND_ICON[template.kind];
  return (
    <Link
      to="/modeles/$slug"
      params={{ slug: template.slug }}
      className={cn(
        "group relative block shrink-0 overflow-hidden rounded-2xl border border-border bg-surface",
        size === "sm" ? "w-36" : "w-full",
      )}
    >
      <div className="relative aspect-[4/5]">
        <TemplateCover template={template} className="absolute inset-0 size-full transition-transform group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/75 px-2 py-0.5 text-[0.625rem] font-semibold text-foreground backdrop-blur">
          {template.inputKind === "photo" ? (
            <>
              <Camera className="size-3" /> Photo
            </>
          ) : (
            <>
              <Icon className="size-3" /> Texte
            </>
          )}
        </span>
        <span className="absolute top-2 right-2 rounded-full bg-background/75 px-2 py-0.5 text-[0.625rem] font-semibold text-gold backdrop-blur">
          {costLabel(template.creditCost)}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="line-clamp-2 text-sm leading-tight font-semibold text-foreground">{template.title}</p>
          <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{usesLabel(template.usesTotal)}</p>
        </div>
      </div>
    </Link>
  );
}

/** Égaliseur animé (purement visuel). */
export function Equalizer({ className, bars = 5 }: { className?: string; bars?: number }) {
  return (
    <span aria-hidden className={cn("flex items-end gap-0.5", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="animate-eq h-full w-1 rounded-full bg-primary-foreground" style={{ animationDelay: `${(i * 0.17) % 0.9}s` }} />
      ))}
    </span>
  );
}

/** Carte de la galerie Musique : illustration, égaliseur, compteur réel et bouton « Utiliser ». */
export function MusicTile({ template, badge }: { template: TemplateCard; badge?: string }) {
  return (
    <div className="relative w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface sm:w-44">
      <Link to="/modeles/$slug" params={{ slug: template.slug }} className="relative block aspect-[4/5]">
        <TemplateCover template={template} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        {badge ? (
          <span className="absolute top-2 left-2 rounded-full bg-music px-2 py-0.5 text-[0.625rem] font-semibold text-primary-foreground">{badge}</span>
        ) : null}
        <Equalizer className="absolute top-2.5 right-2.5 h-4" bars={4} />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="truncate text-sm font-semibold text-foreground">{template.title}</p>
          <p className="truncate text-[0.6875rem] text-muted-foreground">{template.subcategory}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-2.5 pt-1 pb-2.5">
        <span className="flex min-w-0 items-center gap-1 truncate text-[0.6875rem] text-muted-foreground">
          <Music className="size-3 shrink-0 text-gold" /> {template.usesTotal > 0 ? usesLabel(template.usesTotal) : costLabel(template.creditCost)}
        </span>
        <Link
          to="/creer/modele/$slug"
          params={{ slug: template.slug }}
          className="shrink-0 rounded-full bg-music px-3 py-1 text-xs font-semibold text-primary-foreground"
        >
          Utiliser
        </Link>
      </div>
    </div>
  );
}

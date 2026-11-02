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

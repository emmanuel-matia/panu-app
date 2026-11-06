import { Link } from "@tanstack/react-router";
import { ArrowRight, Film, ImageIcon, Mic, Music2, PenLine, Sparkles, type LucideIcon } from "lucide-react";

import type { StudioTool } from "@/lib/media-rules";

const TOOLS: { tool: StudioTool; label: string; icon: LucideIcon }[] = [
  { tool: "image", label: "Image", icon: ImageIcon },
  { tool: "video", label: "Vidéo", icon: Film },
  { tool: "musique", label: "Musique", icon: Music2 },
  { tool: "voix", label: "Voix", icon: Mic },
  { tool: "texte", label: "Texte", icon: PenLine },
];

/** Raccourcis Studio IA compacts, intégrés en haut de l'accueil (plus de barre flottante). */
export function StudioIaBar() {
  return (
    <section aria-label="Studio IA" className="px-4 pb-3">
      <div className="rounded-2xl border border-primary/30 bg-card p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-foreground">
            <Sparkles className="size-4 shrink-0 text-gold" />
            <span className="truncate">Studio IA</span>
          </p>
          <Link
            to="/creer/video"
            search={{ mode: "ai" }}
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent"
          >
            Tout voir <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {TOOLS.map((t) => (
            <Link
              key={t.tool}
              to="/creer/video"
              search={{ mode: "ai", outil: t.tool }}
              aria-label={`${t.label} IA`}
              className="flex flex-col items-center gap-1 rounded-xl bg-surface py-2 text-foreground hover:bg-muted"
            >
              <t.icon className="size-5 text-accent" strokeWidth={1.75} />
              <span className="text-[0.625rem] font-medium">{t.label} IA</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

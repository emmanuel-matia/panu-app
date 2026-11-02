import { Link } from "@tanstack/react-router";
import { ArrowRight, Film, ImageIcon, Mic, Music2, PenLine, Sparkles, type LucideIcon } from "lucide-react";

import type { StudioTool } from "@/lib/media-rules";

const TOOLS: { tool: StudioTool; label: string; icon: LucideIcon }[] = [
  { tool: "image", label: "Image IA", icon: ImageIcon },
  { tool: "video", label: "Vidéo IA", icon: Film },
  { tool: "musique", label: "Musique IA", icon: Music2 },
  { tool: "voix", label: "Voix IA", icon: Mic },
  { tool: "texte", label: "Texte IA", icon: PenLine },
];

/** Barre Studio IA de l'accueil : accès direct à chaque outil de création. */
export function StudioIaBar() {
  return (
    <div className="rounded-2xl border border-primary/40 bg-card/95 p-2.5 shadow-glow backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-foreground">
          <Sparkles className="size-4 shrink-0 text-gold" />
          <span className="truncate">Studio IA – Créez sans limites !</span>
        </p>
        <Link
          to="/creer/video"
          search={{ mode: "ai" }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground"
        >
          Accéder <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map((t) => (
          <Link
            key={t.tool}
            to="/creer/video"
            search={{ mode: "ai", outil: t.tool }}
            className="flex flex-col items-center gap-1 rounded-xl bg-surface py-1.5 text-foreground hover:bg-muted"
          >
            <t.icon className="size-4.5 text-accent" strokeWidth={1.75} />
            <span className="text-[0.625rem] font-medium">{t.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

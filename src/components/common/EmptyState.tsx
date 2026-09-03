import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * État vide honnête : PANU n'affiche jamais de données inventées.
 * Quand aucune donnée réelle n'existe, on affiche ce composant.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-border bg-surface-gradient">
        <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 max-w-[16rem] text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

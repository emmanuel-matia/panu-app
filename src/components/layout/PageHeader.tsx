import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

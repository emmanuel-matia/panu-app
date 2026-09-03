import type { ReactNode } from "react";

import { PanuLogo } from "./PanuLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <PanuLogo />
        <h1 className="mt-8 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8 rounded-2xl border border-border bg-surface-gradient p-5">
          {children}
        </div>
        <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

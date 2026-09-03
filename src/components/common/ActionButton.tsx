import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const variants = {
  brand: "bg-brand text-primary-foreground hover:opacity-90",
  outline: "border border-border bg-surface text-surface-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
} as const;

export function ActionButton({
  variant = "brand",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

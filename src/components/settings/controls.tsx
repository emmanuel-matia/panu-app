import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useSettings, type UserSettings } from "@/hooks/useSettings";
import type { Prefs } from "@/lib/prefs";

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

/** Réglage enregistré mais dont l'effet n'est pas encore appliqué dans l'application. */
function PendingBadge() {
  return (
    <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 align-middle text-[0.625rem] font-medium text-muted-foreground">
      Enregistré · effet à venir
    </span>
  );
}

/** Enregistre un réglage et confirme à l'écran. */
export function useSave() {
  const { settings, prefs, update, loading } = useSettings();
  function save(patch: Partial<Omit<UserSettings, "prefs">> & { prefs?: Partial<Prefs> }) {
    update.mutate(patch, {
      onSuccess: () => toast.success("Réglage enregistré"),
      onError: () => toast.error("Impossible d'enregistrer ce réglage."),
    });
  }
  return { settings, prefs, save, saving: update.isPending, loading };
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  pending = false,
  disabled = false,
}: {
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (value: boolean) => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="flex-1">
        <span className="block text-sm text-surface-foreground">
          {label}
          {pending ? <PendingBadge /> : null}
        </span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} disabled={disabled} />
    </label>
  );
}

export function SelectRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  pending = false,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  pending?: boolean;
}) {
  const [id] = useState(() => `sel-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-surface-foreground">
        {label}
        {pending ? <PendingBadge /> : null}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

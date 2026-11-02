import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from "@/lib/admin-rules";

/** Signalement d'une publication : enregistré dans la base, traité par l'équipe de modération. */
export function ReportPostDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      post_id: postId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error(error.code === "23505" ? "Vous avez déjà signalé cette publication." : "Signalement impossible. Réessayez.");
      if (error.code === "23505") onClose();
      return;
    }
    toast.success("Merci, votre signalement a été transmis à la modération.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Signaler la publication">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-t-3xl border border-border bg-surface p-4 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Signaler cette publication</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <fieldset className="space-y-1">
          <legend className="sr-only">Motif</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-surface-foreground hover:bg-muted">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4 accent-[var(--color-accent)]" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <textarea
          value={details}
          maxLength={REPORT_DETAILS_MAX}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Précisions (facultatif)"
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <button type="submit" disabled={sending} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {sending ? <Loader2 className="size-4 animate-spin" /> : null} Envoyer le signalement
        </button>
      </form>
    </div>
  );
}

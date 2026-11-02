import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fingerprint } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ActionButton } from "@/components/common/ActionButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { passkeyErrorMessage, confirmWithPasskey } from "@/lib/passkeys";
import { passwordStepUp } from "@/lib/passkeys.functions";

/** Nombre de passkeys du compte courant (lecture protégée : uniquement les siennes). */
export function usePasskeyCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["passkeys", "count", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase.from("passkey_credentials").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/**
 * Confirmation renforcée avant une action sensible : passkey (empreinte, visage ou code de l'appareil)
 * si le compte en a une, sinon mot de passe en solution de secours. La base re-vérifie côté serveur.
 */
export function useStepUp() {
  const [retry, setRetry] = useState<null | (() => void)>(null);
  const request = (action: () => void) => setRetry(() => action);
  const dialog = (
    <StepUpDialog
      open={retry !== null}
      onCancel={() => setRetry(null)}
      onConfirmed={() => {
        const action = retry;
        setRetry(null);
        action?.();
      }}
    />
  );
  return { request, dialog };
}

function StepUpDialog({ open, onCancel, onConfirmed }: { open: boolean; onCancel: () => void; onConfirmed: () => void }) {
  const count = usePasskeyCount();
  const confirmPassword = useServerFn(passwordStepUp);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPasskey = (count.data ?? 0) > 0;

  async function withPasskey() {
    setBusy(true);
    setError(null);
    try {
      await confirmWithPasskey();
      toast.success("Identité confirmée");
      onConfirmed();
    } catch (e) {
      setError(passkeyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function withPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPassword({ data: { password } });
      setPassword("");
      toast.success("Identité confirmée");
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setError(null); onCancel(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmer votre identité</DialogTitle>
          <DialogDescription>Cette action sensible demande une confirmation de sécurité récente (valable 10 minutes).</DialogDescription>
        </DialogHeader>
        {count.isPending ? null : hasPasskey ? (
          <div className="space-y-3">
            <ActionButton type="button" className="w-full gap-2" disabled={busy} onClick={() => void withPasskey()}>
              <Fingerprint className="size-4" /> {busy ? "Vérification…" : "Confirmer avec mon appareil"}
            </ActionButton>
            <p className="text-xs text-muted-foreground">Votre téléphone vous demande votre empreinte, votre visage ou votre code. PANU ne reçoit aucune donnée biométrique.</p>
          </div>
        ) : (
          <form onSubmit={withPassword} className="space-y-3">
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Mot de passe" placeholder="Votre mot de passe" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
            <ActionButton type="submit" className="w-full" disabled={busy || !password}>{busy ? "Vérification…" : "Confirmer"}</ActionButton>
            <p className="text-xs text-muted-foreground">Aucune passkey n'est enregistrée : le mot de passe sert de solution de secours. Activez l'empreinte dans Paramètres → Sécurité pour renforcer ce compte.</p>
          </form>
        )}
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

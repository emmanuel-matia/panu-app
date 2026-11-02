import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fingerprint, ScanFace, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ActionButton } from "@/components/common/ActionButton";
import { useStepUp } from "@/components/security/StepUp";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";
import { supabase } from "@/integrations/supabase/client";
import { BIOMETRIC_CONSENT_VERSION, isStepUpRequiredError } from "@/lib/passkey-rules";
import { browserSupportsWebAuthn, passkeyErrorMessage, platformAuthenticatorIsAvailable, registerPasskey } from "@/lib/passkeys";

import { Card, Note } from "./controls";

function Method({ icon, title, status, tone, children }: { icon: ReactNode; title: string; status: string; tone: "on" | "off" | "wait"; children: ReactNode }) {
  const color = tone === "on" ? "bg-accent/15 text-accent" : tone === "wait" ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground";
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          {title} <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${color}`}>{status}</span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

type Device = { id: string; device_label: string; created_at: string; last_used_at: string | null; backed_up: boolean };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "jamais");

export function SecuritySection() {
  const { user } = useAuth();
  const staff = useStaffRole();
  const queryClient = useQueryClient();
  const stepUp = useStepUp();
  const [agreed, setAgreed] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = browserSupportsWebAuthn();
    setSupported(ok);
    if (ok) void platformAuthenticatorIsAvailable().then(setPlatform).catch(() => setPlatform(false));
  }, []);

  const devices = useQuery({
    queryKey: ["passkeys", "list", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("passkey_credentials")
        .select("id, device_label, created_at, last_used_at, backed_up")
        .order("created_at", { ascending: false });
      if (err) throw err;
      return (data ?? []) as Device[];
    },
  });
  const consent = useQuery({
    queryKey: ["biometric-consent", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error: err } = await supabase.from("biometric_consents").select("version, granted_at, withdrawn_at").eq("kind", "passkey").maybeSingle();
      if (err) throw err;
      return data;
    },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["passkeys"] });
    await queryClient.invalidateQueries({ queryKey: ["biometric-consent"] });
  };

  const activate = useMutation({
    mutationFn: async () => {
      const active = consent.data && !consent.data.withdrawn_at;
      if (!active) {
        const { error: err } = await supabase.rpc("record_biometric_consent", { _kind: "passkey", _version: BIOMETRIC_CONSENT_VERSION });
        if (err) throw err;
      }
      await registerPasskey();
    },
    onSuccess: async () => {
      setError(null);
      setAgreed(false);
      toast.success("Appareil enregistré");
      await refresh();
    },
    onError: async (e: Error) => {
      await refresh();
      if (isStepUpRequiredError(e.message)) {
        stepUp.request(() => activate.mutate());
        return;
      }
      setError(passkeyErrorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from("passkey_credentials").delete().eq("id", id);
      if (err) throw err;
    },
    onSuccess: async () => { toast.success("Appareil retiré"); await refresh(); },
    onError: () => toast.error("Impossible de retirer cet appareil."),
  });

  const eraseAll = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.rpc("withdraw_biometric_data", { _kind: "passkey" });
      if (err) throw err;
    },
    onSuccess: async () => { toast.success("Consentement retiré et passkeys supprimées"); await refresh(); },
    onError: () => toast.error("Suppression impossible."),
  });

  const count = devices.data?.length ?? 0;
  const consentActive = Boolean(consent.data && !consent.data.withdrawn_at);
  const canActivate = supported === true && (consentActive || agreed) && !activate.isPending;

  return (
    <>
      <Card title="Méthodes de vérification">
        <ul className="divide-y divide-border">
          <Method icon={<ShieldCheck className="size-4" />} title="Mot de passe" status="Actif" tone="on">Toujours disponible, et utilisé en secours si votre appareil n'a pas de biométrie.</Method>
          <Method icon={<ShieldCheck className="size-4" />} title="Code de double authentification" status="Pas encore disponible" tone="off">Prévu à l'étape « sécurité des comptes ». Rien n'est activé pour l'instant.</Method>
          <Method icon={<Fingerprint className="size-4" />} title="Empreinte ou biométrie de l'appareil (passkey)" status={count > 0 ? `Actif · ${count} appareil${count > 1 ? "s" : ""}` : "Facultatif"} tone={count > 0 ? "on" : "off"}>
            Connexion et confirmation des actions sensibles. La vérification est faite par votre téléphone ; PANU ne voit ni ne stocke aucune empreinte.
          </Method>
          <Method icon={<ScanFace className="size-4" />} title="Vérification par selfie" status="En attente d'autorisation" tone="wait">
            Non activée : aucun fournisseur de reconnaissance faciale n'est connecté et aucun selfie n'est collecté. Elle ne sera proposée qu'après l'accord du fondateur sur le fournisseur et son coût.
          </Method>
        </ul>
      </Card>

      <Card title="Empreinte digitale et passkeys">
        {supported === false ? (
          <div className="space-y-2">
            <p role="status" className="text-sm text-surface-foreground">Ce navigateur ou cet appareil ne prend pas en charge les passkeys.</p>
            <Note>Solution de secours : continuez avec votre mot de passe. Vous pouvez essayer depuis un autre navigateur récent (Chrome, Safari) ou un autre téléphone.</Note>
          </div>
        ) : (
          <>
            {supported && !platform ? <Note>Aucun capteur biométrique n'a été détecté ici : une clé de sécurité ou un gestionnaire de passkeys peut quand même fonctionner.</Note> : null}
            {!consentActive ? (
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-xs leading-relaxed text-surface-foreground">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4" aria-label="Consentement biométrique" />
                <span>
                  J'accepte d'utiliser la biométrie de mon appareil pour me connecter et confirmer mes actions. Mon empreinte ou mon visage reste sur mon téléphone :
                  PANU conserve uniquement une clé publique, la date et le nom de l'appareil. Je peux retirer mon consentement et tout supprimer à tout moment.
                </span>
              </label>
            ) : (
              <Note>Consentement donné le {fmt(consent.data?.granted_at ?? null)} (version {consent.data?.version}).</Note>
            )}
            <ActionButton type="button" className="gap-2" disabled={!canActivate} onClick={() => activate.mutate()}>
              <Fingerprint className="size-4" /> {activate.isPending ? "Vérification sur l'appareil…" : count > 0 ? "Ajouter cet appareil" : "Activer l'empreinte"}
            </ActionButton>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          </>
        )}

        {count > 0 ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(devices.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="min-w-0 text-sm text-surface-foreground">
                  {d.device_label}
                  <span className="block text-xs text-muted-foreground">Ajouté le {fmt(d.created_at)} · dernier usage : {fmt(d.last_used_at)}</span>
                </span>
                <button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Retirer cet appareil (${d.device_label}) ?`)) remove.mutate(d.id); }} className="h-9 rounded-full border border-border px-3 text-xs font-semibold text-destructive">
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {consentActive || count > 0 ? (
          <div className="space-y-2 border-t border-border pt-3">
            <button type="button" disabled={eraseAll.isPending} onClick={() => { if (window.confirm("Retirer votre consentement et supprimer toutes vos passkeys ? Vous pourrez toujours vous connecter avec votre mot de passe.")) eraseAll.mutate(); }} className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-destructive">
              Supprimer mes données biométriques
            </button>
            <Note>Supprime toutes les passkeys enregistrées et retire votre consentement. L'empreinte elle-même n'est jamais chez PANU : elle reste dans votre téléphone.</Note>
          </div>
        ) : null}
      </Card>

      {staff.data ? (
        <Card title="Protection renforcée de votre rôle">
          <p className="text-sm text-surface-foreground">
            {count > 0
              ? "Les actions sensibles (nommer ou retirer un administrateur, changer une offre) exigent une confirmation par votre passkey, vérifiée côté serveur."
              : "Votre rôle donne accès à des actions sensibles. Enregistrez une passkey ci-dessus : sans elle, seule une confirmation par mot de passe est demandée."}
          </p>
          <Note>Les passkeys sont liées au site où elles sont créées : enregistrez-la depuis l'adresse publiée de PANU pour qu'elle serve en production.</Note>
        </Card>
      ) : null}
      <Link to="/parametres/compte" className="block text-center text-xs text-muted-foreground underline">Retour à Votre compte</Link>
      {stepUp.dialog}
    </>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CONSENT_DOCUMENTS, CONSENT_VERSION, needsConsent, type PendingConsent } from "@/lib/legal-consent";

export type ConsentRecord = { version: string; source: string; accepted_at: string; checked_at: string | null };

/** Enregistre la preuve du consentement (date serveur, version, source, appareil). */
export async function recordConsent(pending: Pick<PendingConsent, "version" | "source"> & { checkedAt?: string | null }) {
  const { error } = await supabase.rpc("record_legal_consent", {
    _version: pending.version,
    _source: pending.source,
    _documents: [...CONSENT_DOCUMENTS],
    _user_agent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    ...(pending.checkedAt ? { _checked_at: pending.checkedAt } : {}),
  });
  if (error) throw error;
}

/** Consentements enregistrés pour le compte connecté (le plus récent en premier). */
export function useLegalConsent() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["legal-consents", profile?.id],
    enabled: Boolean(profile),
    queryFn: async (): Promise<ConsentRecord[]> => {
      const { data, error } = await supabase
        .from("legal_consents")
        .select("version, source, accepted_at, checked_at")
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const accept = useMutation({
    mutationFn: () => recordConsent({ version: CONSENT_VERSION, source: "acceptation" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["legal-consents"] }),
  });
  const records = query.data ?? [];
  return {
    records,
    loaded: query.isSuccess,
    current: records.find((r) => r.version === CONSENT_VERSION) ?? null,
    mustAccept: query.isSuccess && needsConsent(records.map((r) => r.version)),
    accept,
  };
}

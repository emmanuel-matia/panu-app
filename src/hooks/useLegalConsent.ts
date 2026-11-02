import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { recordConsent } from "@/lib/consent-record";
import { CONSENT_VERSION, needsConsent } from "@/lib/legal-consent";

export type ConsentRecord = { version: string; source: string; accepted_at: string; checked_at: string | null };

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

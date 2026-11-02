import { supabase } from "@/integrations/supabase/client";

import { CONSENT_DOCUMENTS, type PendingConsent } from "./legal-consent";

/** Enregistre la preuve du consentement (date serveur, version, source, appareil). */
export async function recordConsent(pending: Pick<PendingConsent, "version" | "source"> & { checkedAt?: string | null }) {
  const { error } = await supabase.rpc("record_legal_consent", {
    _version: pending.version,
    _source: pending.source,
    _documents: [...CONSENT_DOCUMENTS],
    ...(typeof navigator === "undefined" ? {} : { _user_agent: navigator.userAgent }),
    ...(pending.checkedAt ? { _checked_at: pending.checkedAt } : {}),
  });
  if (error) throw error;
}

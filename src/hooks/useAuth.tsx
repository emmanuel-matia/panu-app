import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { clearPendingReferral, readPendingReferral } from "@/lib/invite";
import { clearPendingConsent, parsePendingConsent, readPendingConsent } from "@/lib/legal-consent";
import { recordConsent } from "@/lib/consent-record";
import { ensureProfile, type Profile } from "@/lib/profiles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();
  const loadProfile = useCallback(
    async (current: Session | null) => {
      if (!current?.user) {
        setProfile(null);
        return;
      }
      let next = await ensureProfile(current.user);
      if (next?.deactivated_at) {
        // Se reconnecter réactive un compte désactivé temporairement.
        const { error: reactivateError } = await supabase.from("profiles").update({ deactivated_at: null }).eq("id", next.id);
        if (!reactivateError) next = { ...next, deactivated_at: null };
      }
      setProfile(next);
      if (next) {
        // Consentement CGU + confidentialité donné à l'inscription : preuve enregistrée dès la première session.
        const pendingConsent = readPendingConsent() ?? parsePendingConsent(current.user.user_metadata?.["legal_consent"]);
        if (pendingConsent) {
          try {
            await recordConsent(pendingConsent);
            clearPendingConsent();
            void queryClient.invalidateQueries({ queryKey: ["legal-consents"] });
          } catch (consentError) {
            console.error(consentError);
          }
        }
        // Parrainage : le code reçu par lien est enregistré une seule fois (la base refuse doublons et faux parrainages).
        const pendingCode = readPendingReferral();
        if (pendingCode) {
          const { error: referralError } = await supabase.rpc("redeem_referral", { _code: pendingCode });
          if (!referralError) clearPendingReferral();
        }
        // Crédits de bienvenue : la base ne les attribue qu'une seule fois par compte.
        const { error } = await supabase.rpc("claim_welcome_credits");
        if (error) console.error(error);
        void queryClient.invalidateQueries({ queryKey: ["credits"] });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      void loadProfile(next);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  }
  return context;
}

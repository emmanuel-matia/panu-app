import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/lib/credits";

import { useAuth } from "./useAuth";

/** Solde de crédits et offre de l'utilisateur connecté (lecture limitée à son propre compte). */
export function useCredits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credits", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<{ balance: number; plan: Plan } | null> => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("balance, plan")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ? { balance: data.balance, plan: data.plan as Plan } : null;
    },
  });
}

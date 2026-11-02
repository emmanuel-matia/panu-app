import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { parseStaffRole, type StaffRole } from "@/lib/admin-rules";

import { useAuth } from "./useAuth";

/** Rôle d'équipe (fondateur / administrateur) de l'utilisateur connecté, décidé par la base — jamais par le navigateur. */
export function useStaffRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-role", user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async (): Promise<StaffRole | null> => {
      const { data, error } = await supabase.rpc("my_staff_role");
      if (error) throw error;
      return parseStaffRole(data);
    },
  });
}

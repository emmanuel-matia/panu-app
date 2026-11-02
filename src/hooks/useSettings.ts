import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type UserSettings = {
  language: "fr" | "en";
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_messages: boolean;
  default_allow_remix: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: "fr",
  notify_likes: true,
  notify_comments: true,
  notify_follows: true,
  notify_messages: true,
  default_allow_remix: true,
};

/** Réglages de l'utilisateur connecté (valeurs par défaut tant qu'il n'a rien modifié). */
export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["settings", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("language, notify_likes, notify_comments, notify_follows, notify_messages, default_allow_remix")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...DEFAULT_SETTINGS, ...(data as UserSettings) } : DEFAULT_SETTINGS;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const next = { ...(query.data ?? DEFAULT_SETTINGS), ...patch };
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user!.id, ...next, updated_at: new Date().toISOString() });
      if (error) throw error;
      return next;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserSettings>(key);
      queryClient.setQueryData<UserSettings>(key, {
        ...(previous ?? DEFAULT_SETTINGS),
        ...patch,
      });
      return { previous };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
  });

  return { settings: query.data ?? DEFAULT_SETTINGS, loading: query.isLoading, update };
}

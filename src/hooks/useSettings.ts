import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PREFS, parsePrefs, type Prefs } from "@/lib/prefs";

export type UserSettings = {
  language: "fr" | "en";
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_messages: boolean;
  default_allow_remix: boolean;
  prefs: Prefs;
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: "fr",
  notify_likes: true,
  notify_comments: true,
  notify_follows: true,
  notify_messages: true,
  default_allow_remix: true,
  prefs: DEFAULT_PREFS,
};

export function settingsKey(userId: string | undefined) {
  return ["settings", userId] as const;
}

/** Réglages de l'utilisateur connecté (valeurs par défaut tant qu'il n'a rien modifié). */
export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = settingsKey(user?.id);

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "language, notify_likes, notify_comments, notify_follows, notify_messages, default_allow_remix, prefs",
        )
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        language: data.language === "en" ? "en" : "fr",
        prefs: parsePrefs(data.prefs),
      };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Omit<UserSettings, "prefs">> & { prefs?: Partial<Prefs> }) => {
      const current = queryClient.getQueryData<UserSettings>(key) ?? query.data ?? DEFAULT_SETTINGS;
      const next: UserSettings = { ...current, ...patch, prefs: { ...current.prefs, ...patch.prefs } };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user!.id,
        language: next.language,
        notify_likes: next.notify_likes,
        notify_comments: next.notify_comments,
        notify_follows: next.notify_follows,
        notify_messages: next.notify_messages,
        default_allow_remix: next.default_allow_remix,
        prefs: next.prefs as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return next;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserSettings>(key);
      const base = previous ?? DEFAULT_SETTINGS;
      queryClient.setQueryData<UserSettings>(key, {
        ...base,
        ...patch,
        prefs: { ...base.prefs, ...patch.prefs },
      });
      return { previous };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    prefs: (query.data ?? DEFAULT_SETTINGS).prefs,
    loading: query.isLoading && Boolean(user),
    update,
  };
}

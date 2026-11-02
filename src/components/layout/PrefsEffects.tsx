import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { applyAppearance, saveAppearance } from "@/lib/appearance";
import { capturePendingReferral } from "@/lib/invite";

const FLUSH_SECONDS = 30;

/**
 * Effets globaux des préférences : apparence, temps passé (compté seulement quand l'application est visible),
 * rappels d'utilisation, statut « en ligne » et mémorisation d'un code de parrainage reçu par lien.
 */
export function PrefsEffects() {
  const { user } = useAuth();
  const { prefs, loading } = useSettings();
  const queryClient = useQueryClient();
  const pending = useRef(0);
  const todayLocal = useRef(0);
  const sinceBreak = useRef(0);
  const reminded = useRef(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    capturePendingReferral(window.location.search);
  }, []);

  // Apparence : appliquée dès que les réglages sont connus, et suit le thème de l'appareil en mode automatique.
  useEffect(() => {
    if (user && loading) return;
    const appearance = {
      theme: prefs.theme,
      text_size: prefs.text_size,
      high_contrast: prefs.high_contrast,
      reduce_motion: prefs.reduce_motion,
    };
    applyAppearance(appearance);
    if (user) saveAppearance(appearance);
    if (prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(appearance);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [user, loading, prefs.theme, prefs.text_size, prefs.high_contrast, prefs.reduce_motion]);

  // Temps passé, rappels et présence.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function flush() {
      const seconds = Math.min(120, Math.floor(pending.current));
      if (seconds < 1) return;
      pending.current -= seconds;
      const day = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.rpc("add_usage_seconds", { _seconds: seconds, _day: day });
      if (error) pending.current += seconds;
      else void queryClient.invalidateQueries({ queryKey: ["usage", userId] });
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pending.current += 1;
      todayLocal.current += 1;
      sinceBreak.current += 1;
      const p = prefsRef.current;
      if (p.break_reminder_minutes > 0 && sinceBreak.current >= p.break_reminder_minutes * 60) {
        sinceBreak.current = 0;
        toast("Pensez à faire une pause", { description: `Cela fait ${p.break_reminder_minutes} minutes que vous utilisez PANU.` });
      }
      if (p.usage_reminder_minutes > 0 && !reminded.current && todayLocal.current >= p.usage_reminder_minutes * 60) {
        reminded.current = true;
        toast("Rappel de temps passé", { description: `Vous avez utilisé PANU ${p.usage_reminder_minutes} minutes aujourd'hui.` });
      }
      if (pending.current >= FLUSH_SECONDS) void flush();
    }, 1000);

    const presence = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
      }
    }, 120_000);
    void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);

    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(presence);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [user, queryClient]);

  return null;
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  authenticationOptions,
  hasPasskey,
  mintSessionToken,
  recordStepUp,
  registrationOptions,
  verifyAssertion,
  verifyRegistration,
} from "./passkeys.server";

// Les réponses WebAuthn sont validées par la bibliothèque ; on borne seulement la forme générale.
const jsonObject = z.record(z.string(), z.unknown());
const challengeId = z.string().uuid();

/** Passkey : l'appareil (empreinte, visage, code) confirme ; PANU ne reçoit jamais de donnée biométrique. */
export const passkeyRegisterOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: consent } = await context.supabase
      .from("biometric_consents")
      .select("withdrawn_at")
      .eq("kind", "passkey")
      .maybeSingle();
    if (!consent || consent.withdrawn_at) throw new Error("Le consentement est requis avant l'enregistrement.");
    // Ajouter un appareil quand un autre existe exige une confirmation récente par passkey.
    if (await hasPasskey(context.userId)) {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
        .from("step_up_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("method", "passkey")
        .gte("verified_at", since);
      if (!count) throw new Error("Confirmation de sécurité requise");
    }
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const name = profile?.username ?? "compte-panu";
    return registrationOptions(context.userId, name, profile?.display_name ?? name);
  });

export const passkeyRegisterVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challengeId, response: jsonObject }).parse(input))
  .handler(async ({ data, context }) => {
    await verifyRegistration(context.userId, data.challengeId, data.response as never);
    return { ok: true as const };
  });

export const passkeyLoginOptions = createServerFn({ method: "POST" }).handler(async () =>
  authenticationOptions("login", null),
);

export const passkeyLoginVerify = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ challengeId, response: jsonObject }).parse(input))
  .handler(async ({ data }) => {
    try {
      const userId = await verifyAssertion("login", data.challengeId, data.response as never, null);
      const tokenHash = await mintSessionToken(userId);
      return { tokenHash };
    } catch (error) {
      console.error("passkey login", error instanceof Error ? error.message : error);
      throw new Error("Connexion par passkey impossible. Utilisez votre mot de passe.");
    }
  });

export const passkeyStepUpOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => authenticationOptions("step_up", context.userId));

export const passkeyStepUpVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challengeId, response: jsonObject }).parse(input))
  .handler(async ({ data, context }) => {
    await verifyAssertion("step_up", data.challengeId, data.response as never, context.userId);
    await recordStepUp(context.userId, "passkey");
    return { ok: true as const };
  });

/** Solution de secours : appareil sans biométrie. Possible uniquement tant que le compte n'a aucune passkey. */
export const passwordStepUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    if (await hasPasskey(context.userId)) throw new Error("Confirmez avec votre passkey.");
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    if (!email) throw new Error("Confirmation par mot de passe impossible pour ce compte.");
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const probe = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: signed, error } = await probe.auth.signInWithPassword({ email, password: data.password });
    if (error || signed.user?.id !== context.userId) throw new Error("Mot de passe incorrect.");
    await recordStepUp(context.userId, "password");
    return { ok: true as const };
  });

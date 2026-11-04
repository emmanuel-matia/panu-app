import "reflect-metadata";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

import {
  CHALLENGE_TTL_SECONDS,
  CHALLENGE_WINDOW_MINUTES,
  deviceLabelFromUserAgent,
  isChallengeExpired,
  isThrottled,
  MAX_PASSKEYS_PER_USER,
  type StepUpMethod,
} from "./passkey-rules";

import type { Json } from "@/integrations/supabase/types";

type AuthenticatorTransportFuture = NonNullable<RegistrationResponseJSON["response"]["transports"]>[number];
type Purpose = "register" | "login" | "step_up";

/** Les options WebAuthn sont du JSON pur ; ce type les rend sérialisables par les fonctions serveur. */
const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Domaine et origine attendus : ceux du site réellement appelé (une passkey est liée à son domaine). */
export function relyingParty(): { rpID: string; origin: string } {
  const originHeader = getRequestHeader("origin");
  const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "";
  const candidate = originHeader ?? `https://${host}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Origine invalide");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) throw new Error("Connexion sécurisée (HTTPS) requise");
  return { rpID: url.hostname, origin: url.origin };
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`panu-passkey:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stocke un défi à usage unique, après limitation par adresse IP. */
async function storeChallenge(purpose: Purpose, challenge: string, userId: string | null): Promise<string> {
  const db = await admin();
  const ip = getRequestIP({ xForwardedFor: true }) ?? "inconnue";
  const ipHash = await sha256Hex(ip);
  const since = new Date(Date.now() - CHALLENGE_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await db
    .from("webauthn_challenges")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (isThrottled(count ?? 0)) throw new Error("Trop de tentatives. Réessayez dans quelques minutes.");
  // Nettoyage des défis expirés.
  await db.from("webauthn_challenges").delete().lt("expires_at", new Date().toISOString());
  const { data, error } = await db
    .from("webauthn_challenges")
    .insert({
      purpose,
      challenge,
      user_id: userId,
      ip_hash: ipHash,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Impossible de préparer la vérification");
  return data.id;
}

/** Récupère puis détruit le défi (usage unique). */
async function consumeChallenge(id: string, purpose: Purpose, userId: string | null): Promise<string> {
  const db = await admin();
  const { data } = await db
    .from("webauthn_challenges")
    .delete()
    .eq("id", id)
    .eq("purpose", purpose)
    .select("challenge, user_id, expires_at")
    .maybeSingle();
  if (!data) throw new Error("Vérification expirée. Recommencez.");
  if (isChallengeExpired(new Date(data.expires_at), new Date())) throw new Error("Vérification expirée. Recommencez.");
  if (userId !== null && data.user_id !== userId) throw new Error("Vérification invalide.");
  return data.challenge;
}

async function passkeysOf(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("passkey_credentials")
    .select("credential_id, transports")
    .eq("user_id", userId);
  return data ?? [];
}

export async function registrationOptions(userId: string, userName: string, displayName: string) {
  const { rpID } = relyingParty();
  const existing = await passkeysOf(userId);
  if (existing.length >= MAX_PASSKEYS_PER_USER) throw new Error("Nombre maximal d'appareils atteint.");
  const options = await generateRegistrationOptions({
    rpName: "PANU",
    rpID,
    userName,
    userDisplayName: displayName,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const challengeId = await storeChallenge("register", options.challenge, userId);
  return { challengeId, options: asJson(options) };
}

export async function verifyRegistration(userId: string, challengeId: string, response: RegistrationResponseJSON) {
  const { rpID, origin } = relyingParty();
  const expectedChallenge = await consumeChallenge(challengeId, "register", userId);
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!result.verified || !result.registrationInfo) throw new Error("Vérification refusée par l'appareil.");
  const { credential, credentialBackedUp } = result.registrationInfo;
  const db = await admin();
  const ua = getRequestHeader("user-agent") ?? "";
  const { error } = await db.from("passkey_credentials").insert({
    user_id: userId,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: (credential.transports ?? []) as string[],
    device_label: deviceLabelFromUserAgent(ua),
    backed_up: credentialBackedUp,
  });
  if (error) throw new Error("Cet appareil est déjà enregistré ou l'enregistrement a échoué.");
}

export async function authenticationOptions(purpose: "login" | "step_up", userId: string | null) {
  const { rpID } = relyingParty();
  let allow: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
  if (userId) {
    const creds = await passkeysOf(userId);
    if (creds.length === 0) throw new Error("Aucune passkey enregistrée.");
    allow = creds.map((c) => ({ id: c.credential_id, transports: c.transports as AuthenticatorTransportFuture[] }));
  }
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    ...(allow ? { allowCredentials: allow } : {}),
  });
  const challengeId = await storeChallenge(purpose, options.challenge, userId);
  return { challengeId, options: asJson(options) };
}

/** Vérifie une assertion ; renvoie l'identifiant du compte propriétaire de la passkey. */
export async function verifyAssertion(
  purpose: "login" | "step_up",
  challengeId: string,
  response: AuthenticationResponseJSON,
  expectedUserId: string | null,
): Promise<string> {
  const { rpID, origin } = relyingParty();
  const expectedChallenge = await consumeChallenge(challengeId, purpose, expectedUserId);
  const db = await admin();
  const { data: row } = await db
    .from("passkey_credentials")
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!row) throw new Error("Passkey inconnue.");
  if (expectedUserId && row.user_id !== expectedUserId) throw new Error("Cette passkey n'appartient pas à ce compte.");
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: row.credential_id,
      publicKey: isoBase64URL.toBuffer(row.public_key),
      counter: Number(row.counter),
      transports: row.transports as AuthenticatorTransportFuture[],
    },
  });
  if (!result.verified) throw new Error("Vérification refusée par l'appareil.");
  await db
    .from("passkey_credentials")
    .update({ counter: result.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  return row.user_id;
}

export async function recordStepUp(userId: string, method: StepUpMethod) {
  const db = await admin();
  const { error } = await db.from("step_up_events").insert({ user_id: userId, method });
  if (error) throw new Error("Confirmation impossible");
}

/** Jeton à usage unique permettant au navigateur d'ouvrir la session du compte dont la passkey est vérifiée. */
export async function mintSessionToken(userId: string): Promise<string> {
  const db = await admin();
  const { data: found, error } = await db.auth.admin.getUserById(userId);
  const user = found?.user;
  if (error || !user?.email) throw new Error("Connexion par passkey impossible.");
  if (user.banned_until && new Date(user.banned_until) > new Date()) throw new Error("Connexion par passkey impossible.");
  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email: user.email });
  const token = link?.properties?.hashed_token;
  if (linkError || !token) throw new Error("Connexion par passkey impossible.");
  return token;
}

export async function hasPasskey(userId: string): Promise<boolean> {
  return (await passkeysOf(userId)).length > 0;
}

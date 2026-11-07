import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { signStoragePaths } from "./supabase-public.server";

/**
 * Live PANU : diffusion WebRTC via Cloudflare Realtime (SFU). Le secret de l'application
 * Cloudflare reste côté serveur ; le navigateur n'échange que des descriptions SDP.
 * Chaque direct est enregistré dans `live_streams` (écritures serveur uniquement).
 */

async function cf(path: string, body?: unknown, method = "POST") {
  const app = process.env["CF_REALTIME_APP_ID"];
  const secret = process.env["CF_REALTIME_APP_SECRET"];
  if (!app || !secret) throw new Error("Service de diffusion non configuré.");
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${app}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Cloudflare Realtime ${res.status}: ${text}`);
    throw new Error("Le service de diffusion a refusé la demande.");
  }
  const json = JSON.parse(text || "{}") as Record<string, unknown>;
  if (json["errorCode"]) {
    console.error("Cloudflare Realtime", json);
    throw new Error("Le service de diffusion a refusé la demande.");
  }
  return json;
}

type SDP = { type: "offer" | "answer"; sdp: string };
const sdpSchema = z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().min(10).max(20000) });

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function ownStream(streamId: string, userId: string) {
  const db = await admin();
  const { data } = await db.from("live_streams").select("*").eq("id", streamId).eq("host_id", userId).maybeSingle();
  if (!data || data.status === "ended") throw new Error("Ce direct n'est plus actif.");
  return { db, stream: data };
}

/** Démarre un direct : termine les anciens directs de l'hôte, ouvre une session et pousse les pistes. */
export const startLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(80),
        offer: sdpSchema,
        tracks: z.array(z.object({ mid: z.string().max(10), kind: z.enum(["video", "audio"]) })).min(1).max(2),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("host_id", context.userId)
      .neq("status", "ended");
    const session = await cf("/sessions/new");
    const sessionId = String(session["sessionId"]);
    const names = { video: `v-${crypto.randomUUID()}`, audio: `a-${crypto.randomUUID()}` };
    const pushed = await cf(`/sessions/${sessionId}/tracks/new`, {
      sessionDescription: data.offer,
      tracks: data.tracks.map((t) => ({ location: "local", mid: t.mid, trackName: names[t.kind] })),
    });
    const has = (k: "video" | "audio") => data.tracks.some((t) => t.kind === k);
    const { data: row, error } = await db
      .from("live_streams")
      .insert({
        host_id: context.userId,
        title: data.title,
        cf_session_id: sessionId,
        video_track: has("video") ? names.video : null,
        audio_track: has("audio") ? names.audio : null,
      })
      .select("id")
      .single();
    if (error) throw new Error("Impossible d'enregistrer le direct.");
    return { streamId: row.id, answer: pushed["sessionDescription"] as SDP };
  });

/** Signal de vie de l'hôte : statut (direct/pause) et nombre de spectateurs pour le record. */
export const liveHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ streamId: z.string().uuid(), status: z.enum(["live", "paused"]), viewers: z.number().int().min(0).max(100000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, stream } = await ownStream(data.streamId, context.userId);
    await db
      .from("live_streams")
      .update({
        status: data.status,
        last_heartbeat_at: new Date().toISOString(),
        peak_viewers: Math.max(stream.peak_viewers, data.viewers),
      })
      .eq("id", data.streamId);
    return { ok: true as const };
  });

export const endLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ streamId: z.string().uuid(), viewers: z.number().int().min(0).max(100000) }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: s } = await db.from("live_streams").select("peak_viewers").eq("id", data.streamId).eq("host_id", context.userId).maybeSingle();
    if (!s) throw new Error("Direct introuvable.");
    await db
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString(), peak_viewers: Math.max(s.peak_viewers, data.viewers) })
      .eq("id", data.streamId);
    const { count } = await db.from("live_viewers").select("viewer_id", { count: "exact", head: true }).eq("stream_id", data.streamId);
    return { totalViewers: count ?? 0, peakViewers: Math.max(s.peak_viewers, data.viewers) };
  });

export type LiveSummary = {
  id: string;
  title: string;
  status: "live" | "paused";
  startedAt: string;
  totalViewers: number;
  hostId: string;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatarUrl: string | null;
};

export const listLives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveSummary[]> => {
    const { data, error } = await context.supabase.rpc("list_live_streams");
    if (error) throw new Error("Impossible de charger les directs.");
    const rows = data ?? [];
    const signed = await signStoragePaths(
      "avatars",
      rows.map((r) => ({ path: r.host_avatar_url, ownerId: r.host_id })),
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as "live" | "paused",
      startedAt: r.started_at,
      totalViewers: Number(r.total_viewers ?? 0),
      hostId: r.host_id,
      hostUsername: r.host_username,
      hostDisplayName: r.host_display_name,
      hostAvatarUrl: r.host_avatar_url ? (signed.get(r.host_avatar_url) ?? null) : null,
    }));
  });

/** Un spectateur rejoint : session dédiée qui tire les pistes de l'hôte. */
export const joinLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ streamId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: visible } = await context.supabase.rpc("list_live_streams");
    const live = (visible ?? []).find((r) => r.id === data.streamId);
    if (!live) throw new Error("Ce direct est terminé ou indisponible.");
    const db = await admin();
    const { data: s } = await db.from("live_streams").select("cf_session_id, video_track, audio_track").eq("id", data.streamId).single();
    if (!s?.cf_session_id) throw new Error("Ce direct n'est pas encore prêt.");
    if (live.host_id !== context.userId) {
      await db.from("live_viewers").upsert({ stream_id: data.streamId, viewer_id: context.userId }, { onConflict: "stream_id,viewer_id", ignoreDuplicates: true });
    }
    const session = await cf("/sessions/new");
    const sessionId = String(session["sessionId"]);
    const tracks = [s.video_track, s.audio_track]
      .filter((t): t is string => Boolean(t))
      .map((trackName) => ({ location: "remote", sessionId: s.cf_session_id, trackName }));
    const pulled = await cf(`/sessions/${sessionId}/tracks/new`, { tracks });
    return {
      sessionId,
      offer: pulled["sessionDescription"] as SDP,
      title: live.title,
      status: live.status as "live" | "paused",
      host: { username: live.host_username, displayName: live.host_display_name },
    };
  });

export const liveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().min(8).max(100).regex(/^[\w-]+$/), answer: sdpSchema }).parse(i))
  .handler(async ({ data }) => {
    await cf(`/sessions/${data.sessionId}/renegotiate`, { sessionDescription: data.answer }, "PUT");
    return { ok: true as const };
  });

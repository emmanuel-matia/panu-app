import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { FAL_KEY_NAMES, firstSuccessful, optionalKey, providerError, requireProviderKey } from "./ai-providers.server";
import { refundCredits, withCredits } from "./credits.server";
import { AI_DURATIONS, AI_PROMPT_MAX, AI_PROMPT_MIN } from "./video-rules";
import { toBrowserUrl } from "./supabase-public.server";

/**
 * Génération vidéo : Fal.ai (Kling, file d'attente) puis PixVerse en secours.
 * Le fournisseur est mémorisé dans l'identifiant de tâche : `px_<id>` pour PixVerse, identifiant Fal sinon.
 */
const FAL_QUEUE_URL = "https://queue.fal.run";
const VIDEO_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";
/** Les URL de suivi utilisent l'identifiant racine du modèle. */
const VIDEO_APP = "fal-ai/kling-video";
const PIXVERSE_URL = "https://app-api.pixverse.ai/openapi/v2";
const PIXVERSE_MODEL = "v5";
const PIXVERSE_PREFIX = "px_";
const REQUEST_ID = /^[A-Za-z0-9_-]{1,100}$/;
const PIXVERSE_ID = /^px_\d{1,30}$/;

export type AiVideoStatus =
  | { status: "queued" | "in_progress"; progress: number | null; provider: string; queuePosition: number | null }
  | { status: "completed"; videoPath: string; videoUrl: string; provider: string }
  | { status: "failed"; error: string };

type PixverseBody<T> = { ErrCode?: number; ErrMsg?: string; Error?: { Type?: string; Message?: string }; Resp?: T | null };

/** Appel PixVerse : en-têtes API-KEY + Ai-trace-id unique, réponse `{ ErrCode, ErrMsg, Resp }`. */
async function pixverse<T>(key: string, path: string, init?: { method: "POST"; body: unknown }): Promise<T> {
  const response = await fetch(`${PIXVERSE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "API-KEY": key,
      "Ai-trace-id": crypto.randomUUID(),
      ...(init ? { "Content-Type": "application/json" } : {}),
    },
    ...(init ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw await providerError("PixVerse", response);
  const body = (await response.json()) as PixverseBody<T>;
  if (body.ErrCode !== 0 || !body.Resp) {
    console.error(`[PixVerse] ${body.ErrCode}: ${body.ErrMsg}`);
    if (body.Error?.Type === "INSUFFICIENT_CREDITS" || /balance|credit/i.test(body.ErrMsg ?? "")) {
      throw new Error("PixVerse : solde de crédits insuffisant sur votre compte PixVerse.");
    }
    throw new Error(`PixVerse a refusé la demande. ${body.ErrMsg ?? ""}`.trim());
  }
  return body.Resp;
}

async function startFal(key: string, prompt: string, duration: number, aspectRatio: string): Promise<string> {
  const response = await fetch(`${FAL_QUEUE_URL}/${VIDEO_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, duration: String(duration), aspect_ratio: aspectRatio }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw await providerError("Fal.ai", response);
  const job = (await response.json()) as { request_id?: string };
  if (!job.request_id || !REQUEST_ID.test(job.request_id) || job.request_id.startsWith(PIXVERSE_PREFIX)) {
    throw new Error("Fal.ai n'a pas renvoyé d'identifiant de génération.");
  }
  return job.request_id;
}

async function startPixverse(key: string, prompt: string, duration: number, aspectRatio: string): Promise<string> {
  const resp = await pixverse<{ video_id?: number }>(key, "/video/text/generate", {
    method: "POST",
    body: {
      model: PIXVERSE_MODEL,
      prompt,
      // PixVerse v5 accepte 5 ou 8 secondes.
      duration: duration > 5 ? 8 : 5,
      quality: "540p",
      aspect_ratio: aspectRatio,
    },
  });
  if (!resp.video_id) throw new Error("PixVerse n'a pas renvoyé d'identifiant de génération.");
  return `${PIXVERSE_PREFIX}${resp.video_id}`;
}

function providerOf(jobId: string) {
  return jobId.startsWith(PIXVERSE_PREFIX) ? "PixVerse" : "Fal.ai";
}

/** Lance une génération vidéo par IA pour l'utilisateur connecté. */
export const startAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(AI_PROMPT_MIN).max(AI_PROMPT_MAX),
        duration: z.union([z.literal(AI_DURATIONS[0]), z.literal(AI_DURATIONS[1])]),
        aspectRatio: z.enum(["9:16", "16:9"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ jobId: string; provider: string }> => {
    const fal = optionalKey(...FAL_KEY_NAMES);
    const px = optionalKey("PIXVERSE_API_KEY");
    const attempts = [
      ...(fal ? [{ provider: "Fal.ai", run: () => startFal(fal, data.prompt, data.duration, data.aspectRatio) }] : []),
      ...(px ? [{ provider: "PixVerse", run: () => startPixverse(px, data.prompt, data.duration, data.aspectRatio) }] : []),
    ];
    return withCredits(context, "video", async () => {
      const { provider, result: externalId } = await firstSuccessful(attempts, "La génération vidéo");
      const { data: row, error } = await context.supabase
        .from("video_jobs")
        .insert({ user_id: context.userId, gateway_job_id: externalId, prompt: data.prompt, status: "queued" })
        .select("id")
        .single();
      if (error || !row) {
        console.error(error);
        throw new Error("La génération a démarré mais n'a pas pu être enregistrée.");
      }
      return { jobId: row.id, provider };
    });
  });

type Poll =
  | { state: "queued" | "in_progress"; queuePosition: number | null }
  | { state: "done"; url: string }
  | { state: "failed"; message: string };

async function pollFal(requestId: string): Promise<Poll> {
  const key = requireProviderKey(FAL_KEY_NAMES, "La génération vidéo (Fal.ai)");
  const base = `${FAL_QUEUE_URL}/${VIDEO_APP}/requests/${requestId}`;
  const statusRes = await fetch(`${base}/status`, { headers: { Authorization: `Key ${key}` } });
  if (statusRes.status === 404) return { state: "failed", message: "Génération introuvable chez Fal.ai." };
  if (!statusRes.ok) throw await providerError("Fal.ai", statusRes);
  const job = (await statusRes.json()) as {
    status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
    queue_position?: number;
  };
  if (job.status !== "COMPLETED") {
    return {
      state: job.status === "IN_PROGRESS" ? "in_progress" : "queued",
      queuePosition: typeof job.queue_position === "number" ? job.queue_position : null,
    };
  }
  const resultRes = await fetch(base, { headers: { Authorization: `Key ${key}` } });
  if (!resultRes.ok) return { state: "failed", message: (await providerError("Fal.ai", resultRes)).message };
  const result = (await resultRes.json()) as { video?: { url?: string } };
  const url = result.video?.url;
  if (!url?.startsWith("https://")) return { state: "failed", message: "Fal.ai n'a renvoyé aucune vidéo." };
  return { state: "done", url };
}

async function pollPixverse(jobId: string): Promise<Poll> {
  const key = requireProviderKey("PIXVERSE_API_KEY", "La génération vidéo (PixVerse)");
  const resp = await pixverse<{ status?: number; url?: string }>(
    key,
    `/video/result/${jobId.slice(PIXVERSE_PREFIX.length)}`,
  );
  // 1 = terminée, 5 = en cours, 7 = refusée par la modération, 8 = échec.
  if (resp.status === 1) {
    if (!resp.url?.startsWith("https://")) return { state: "failed", message: "PixVerse n'a renvoyé aucune vidéo." };
    return { state: "done", url: resp.url };
  }
  if (resp.status === 7) return { state: "failed", message: "PixVerse a refusé ce contenu (modération)." };
  if (resp.status === 8) return { state: "failed", message: "PixVerse n'a pas pu générer cette vidéo." };
  return { state: "in_progress", queuePosition: null };
}

/** Suit une génération ; à la fin, enregistre la vidéo dans le stockage de l'utilisateur. */
export const checkAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AiVideoStatus> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("video_jobs")
      .select("id, gateway_job_id, status, video_path, error")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error || !row) throw new Error("Génération introuvable.");
    const provider = providerOf(row.gateway_job_id);

    const signed = async (path: string) => {
      const { data: s, error: e } = await supabase.storage.from("videos").createSignedUrl(path, 60 * 60 * 6);
      if (e || !s) throw new Error("Vidéo enregistrée mais impossible de l'afficher.");
      return toBrowserUrl(s.signedUrl);
    };
    const fail = async (message: string): Promise<AiVideoStatus> => {
      await supabase.from("video_jobs").update({ status: "failed", error: message }).eq("id", row.id);
      // Génération échouée : les crédits débités au lancement sont rendus (une seule fois, le statut passe à « failed »).
      await refundCredits(userId, "video");
      return { status: "failed", error: `${message} Vos crédits ont été rendus.` };
    };

    if (row.status === "completed" && row.video_path) {
      return { status: "completed", videoPath: row.video_path, videoUrl: await signed(row.video_path), provider };
    }
    if (row.status === "failed") {
      return { status: "failed", error: row.error ?? "La génération a échoué." };
    }
    // L'identifiant n'est jamais injecté tel quel dans une URL sans vérification.
    const isPixverse = row.gateway_job_id.startsWith(PIXVERSE_PREFIX);
    if (isPixverse ? !PIXVERSE_ID.test(row.gateway_job_id) : !REQUEST_ID.test(row.gateway_job_id)) {
      return fail(`Génération introuvable chez ${provider}.`);
    }

    const poll = isPixverse ? await pollPixverse(row.gateway_job_id) : await pollFal(row.gateway_job_id);
    if (poll.state === "failed") return fail(poll.message);
    if (poll.state !== "done") {
      if (poll.state !== row.status) {
        await supabase.from("video_jobs").update({ status: poll.state }).eq("id", row.id);
      }
      return { status: poll.state, progress: null, provider, queuePosition: poll.queuePosition };
    }

    // On copie tout de suite la vidéo chez nous : le lien du fournisseur peut expirer.
    const contentRes = await fetch(poll.url);
    if (!contentRes.ok) throw new Error("Vidéo générée mais téléchargement impossible. Réessayez.");
    const bytes = await contentRes.arrayBuffer();

    const path = `${userId}/ai-${row.id}.mp4`;
    const upload = await supabase.storage.from("videos").upload(path, bytes, { contentType: "video/mp4", upsert: false });
    if (upload.error && !/exists|duplicate/i.test(upload.error.message)) {
      console.error(upload.error);
      throw new Error("Vidéo générée mais impossible de l'enregistrer. Réessayez.");
    }
    await supabase.from("video_jobs").update({ status: "completed", video_path: path }).eq("id", row.id);
    return { status: "completed", videoPath: path, videoUrl: await signed(path), provider };
  });

/** Dernière génération vidéo encore en cours (pour reprendre le suivi après un rechargement). */
export const latestRunningAiVideo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ jobId: string; prompt: string; createdAt: string } | null> => {
    const { data } = await context.supabase
      .from("video_jobs")
      .select("id, prompt, created_at, status")
      .in("status", ["queued", "in_progress"])
      .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? { jobId: data.id, prompt: data.prompt, createdAt: data.created_at } : null;
  });

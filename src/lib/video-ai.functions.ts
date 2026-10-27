import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { providerError, requireProviderKey } from "./ai-providers.server";
import { AI_DURATIONS, AI_PROMPT_MAX, AI_PROMPT_MIN } from "./video-rules";
import { toBrowserUrl } from "./supabase-public.server";

/** Génération vidéo via Fal.ai (file d'attente) avec la clé personnelle FAL_API_KEY. */
const FAL_QUEUE_URL = "https://queue.fal.run";
const VIDEO_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";
/** Les URL de suivi utilisent l'identifiant racine du modèle. */
const VIDEO_APP = "fal-ai/kling-video";
const REQUEST_ID = /^[A-Za-z0-9_-]{1,100}$/;

export type AiVideoStatus =
  | { status: "queued" | "in_progress"; progress: number | null }
  | { status: "completed"; videoPath: string; videoUrl: string }
  | { status: "failed"; error: string };

function falKey() {
  return requireProviderKey("FAL_API_KEY", "La génération vidéo (Fal.ai)");
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
  .handler(async ({ data, context }): Promise<{ jobId: string }> => {
    const response = await fetch(`${FAL_QUEUE_URL}/${VIDEO_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: data.prompt,
        duration: String(data.duration),
        aspect_ratio: data.aspectRatio,
      }),
    });
    if (!response.ok) throw await providerError("Fal.ai", response);
    const job = (await response.json()) as { request_id?: string };
    if (!job.request_id || !REQUEST_ID.test(job.request_id)) {
      throw new Error("Fal.ai n'a pas renvoyé d'identifiant de génération.");
    }

    const { data: row, error } = await context.supabase
      .from("video_jobs")
      .insert({
        user_id: context.userId,
        gateway_job_id: job.request_id,
        prompt: data.prompt,
        status: "queued",
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error(error);
      throw new Error("La génération a démarré mais n'a pas pu être enregistrée.");
    }
    return { jobId: row.id };
  });

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

    const signed = async (path: string) => {
      const { data: s, error: e } = await supabase.storage
        .from("videos")
        .createSignedUrl(path, 60 * 60 * 6);
      if (e || !s) throw new Error("Vidéo enregistrée mais impossible de l'afficher.");
      return toBrowserUrl(s.signedUrl);
    };
    const fail = async (message: string): Promise<AiVideoStatus> => {
      await supabase.from("video_jobs").update({ status: "failed", error: message }).eq("id", row.id);
      return { status: "failed", error: message };
    };

    if (row.status === "completed" && row.video_path) {
      return { status: "completed", videoPath: row.video_path, videoUrl: await signed(row.video_path) };
    }
    if (row.status === "failed") {
      return { status: "failed", error: row.error ?? "La génération a échoué." };
    }
    // L'identifiant n'est jamais injecté tel quel dans une URL sans vérification.
    if (!REQUEST_ID.test(row.gateway_job_id)) return fail("Génération introuvable chez Fal.ai.");

    const key = falKey();
    const base = `${FAL_QUEUE_URL}/${VIDEO_APP}/requests/${row.gateway_job_id}`;
    const statusRes = await fetch(`${base}/status`, { headers: { Authorization: `Key ${key}` } });
    if (statusRes.status === 404) return fail("Génération introuvable chez Fal.ai.");
    if (!statusRes.ok) throw await providerError("Fal.ai", statusRes);
    const job = (await statusRes.json()) as { status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" };

    if (job.status !== "COMPLETED") {
      const status = job.status === "IN_PROGRESS" ? "in_progress" : "queued";
      if (status !== row.status) {
        await supabase.from("video_jobs").update({ status }).eq("id", row.id);
      }
      return { status, progress: null };
    }

    const resultRes = await fetch(base, { headers: { Authorization: `Key ${key}` } });
    if (!resultRes.ok) {
      const err = await providerError("Fal.ai", resultRes);
      return fail(err.message);
    }
    const result = (await resultRes.json()) as { video?: { url?: string } };
    const videoUrl = result.video?.url;
    if (!videoUrl || !videoUrl.startsWith("https://")) {
      return fail("Fal.ai n'a renvoyé aucune vidéo pour cette demande.");
    }

    // On copie tout de suite la vidéo chez nous : le lien du fournisseur peut expirer.
    const contentRes = await fetch(videoUrl);
    if (!contentRes.ok) throw new Error("Vidéo générée mais téléchargement impossible. Réessayez.");
    const bytes = await contentRes.arrayBuffer();

    const path = `${userId}/ai-${row.id}.mp4`;
    const upload = await supabase.storage
      .from("videos")
      .upload(path, bytes, { contentType: "video/mp4", upsert: false });
    if (upload.error && !/exists|duplicate/i.test(upload.error.message)) {
      console.error(upload.error);
      throw new Error("Vidéo générée mais impossible de l'enregistrer. Réessayez.");
    }
    await supabase
      .from("video_jobs")
      .update({ status: "completed", video_path: path })
      .eq("id", row.id);
    return { status: "completed", videoPath: path, videoUrl: await signed(path) };
  });

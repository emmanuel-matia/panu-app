import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { AI_DURATIONS, AI_PROMPT_MAX, AI_PROMPT_MIN } from "./video-rules";
import { toBrowserUrl } from "./supabase-public.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev";
const VIDEO_MODEL = "google/gemini-omni-1.1-flash";

type GatewayJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress?: number;
  error?: { code: string; message: string };
};

export type AiVideoStatus =
  | { status: "queued" | "in_progress"; progress: number | null }
  | { status: "completed"; videoPath: string; videoUrl: string }
  | { status: "failed"; error: string };

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Le service de génération vidéo n'est pas configuré (clé IA absente).");
  return key;
}

/** Traduit une erreur du service IA en message clair pour l'utilisateur. */
async function gatewayError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  const detail = body?.message ?? "";
  if (response.status === 402) {
    return new Error(
      "Crédits IA insuffisants : ajoutez des crédits à votre espace Lovable pour générer une vidéo.",
    );
  }
  if (response.status === 429) {
    return new Error(
      "Une génération est déjà en cours ou la limite est atteinte. Patientez puis réessayez.",
    );
  }
  if (response.status === 400) {
    return new Error(`Demande refusée par le service IA. ${detail}`.trim());
  }
  if (response.status === 403) {
    return new Error(`Génération vidéo non autorisée pour cet espace. ${detail}`.trim());
  }
  return new Error("Le service de génération vidéo est momentanément indisponible.");
}

/** Lance une génération vidéo par IA pour l'utilisateur connecté. */
export const startAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(AI_PROMPT_MIN).max(AI_PROMPT_MAX),
        duration: z.union([z.literal(AI_DURATIONS[0]), z.literal(AI_DURATIONS[1]), z.literal(AI_DURATIONS[2])]),
        aspectRatio: z.enum(["9:16", "16:9"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ jobId: string }> => {
    const response = await fetch(`${GATEWAY_URL}/v1/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: VIDEO_MODEL,
        input: data.prompt,
        response_format: {
          type: "video",
          resolution: "720p",
          duration: `${data.duration}s`,
          aspect_ratio: data.aspectRatio,
        },
      }),
    });
    if (!response.ok) throw await gatewayError(response);
    const job = (await response.json()) as GatewayJob;

    const { data: row, error } = await context.supabase
      .from("video_jobs")
      .insert({
        user_id: context.userId,
        gateway_job_id: job.id,
        prompt: data.prompt,
        status: job.status,
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

    if (row.status === "completed" && row.video_path) {
      return { status: "completed", videoPath: row.video_path, videoUrl: await signed(row.video_path) };
    }
    if (row.status === "failed") {
      return { status: "failed", error: row.error ?? "La génération a échoué." };
    }

    const key = apiKey();
    const jobId = encodeURIComponent(row.gateway_job_id);
    const pollRes = await fetch(`${GATEWAY_URL}/v1/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    });
    if (!pollRes.ok) throw await gatewayError(pollRes);
    const job = (await pollRes.json()) as GatewayJob;

    if (job.status === "failed") {
      const message =
        job.error?.code === "moderation_blocked"
          ? "La vidéo générée a été bloquée par les filtres de sécurité. Modifiez la description."
          : (job.error?.message ?? "La génération a échoué.");
      await supabase.from("video_jobs").update({ status: "failed", error: message }).eq("id", row.id);
      return { status: "failed", error: message };
    }

    if (job.status !== "completed") {
      if (job.status !== row.status) {
        await supabase.from("video_jobs").update({ status: job.status }).eq("id", row.id);
      }
      return { status: job.status, progress: job.progress ?? null };
    }

    // Terminé : on télécharge tout de suite (le lien du service expire) et on stocke chez nous.
    const contentRes = await fetch(`${GATEWAY_URL}/v1/videos/${jobId}/content`, {
      headers: { Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    });
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

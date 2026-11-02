import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

import { FAL_KEY_NAMES, providerError, requireProviderKey } from "./ai-providers.server";
import { toBrowserUrl } from "./supabase-public.server";
import {
  AI_IMAGE_FORMATS,
  AI_MEDIA_PROMPT_MIN,
  AI_TEXT_PROMPT_MAX,
  AI_VOICE_TEXT_MAX,
  AI_VOICES,
} from "./media-rules";

const FAL_IMAGE_MODEL = "fal-ai/flux/schnell";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

const IMAGE_SIZE: Record<(typeof AI_IMAGE_FORMATS)[number], string> = {
  portrait: "portrait_16_9",
  square: "square_hd",
  landscape: "landscape_16_9",
};

/** Image générée par Fal.ai (FLUX) avec la clé personnelle FAL_KEY. */
export const generateAiImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_TEXT_PROMPT_MAX),
        format: z.enum(AI_IMAGE_FORMATS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AiSavedCreation> => {
    const key = requireProviderKey(FAL_KEY_NAMES, "La génération d'images (Fal.ai)");
    const response = await fetch(`https://fal.run/${FAL_IMAGE_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: data.prompt,
        image_size: IMAGE_SIZE[data.format],
        num_images: 1,
        enable_safety_checker: true,
      }),
    });
    if (!response.ok) throw await providerError("Fal.ai", response);
    const body = (await response.json()) as {
      images?: { url?: string; content_type?: string }[];
      has_nsfw_concepts?: boolean[];
    };
    if (body.has_nsfw_concepts?.[0]) {
      throw new Error("L'image a été bloquée par les filtres de sécurité. Modifiez la description.");
    }
    const remote = body.images?.[0]?.url;
    if (!remote || !remote.startsWith("https://")) {
      throw new Error("Fal.ai n'a renvoyé aucune image pour cette demande.");
    }

    // Les liens Fal.ai expirent : l'image est copiée tout de suite dans l'espace privé de l'utilisateur.
    const file = await fetch(remote);
    if (!file.ok) throw new Error("L'image générée n'a pas pu être récupérée. Réessayez.");
    const mime = file.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return saveCreation(context, {
      bucket: "ai-images",
      kind: "image",
      prompt: data.prompt,
      bytes: await file.arrayBuffer(),
      mime,
      ext,
    });
  });

export type AiSavedCreation = { id: string; path: string; url: string; mime: string };

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

/** Enregistre un fichier généré dans le dossier de l'utilisateur et l'ajoute à son historique. */
async function saveCreation(
  context: AuthContext,
  file: {
    bucket: "ai-images" | "ai-audio";
    kind: "image" | "voice" | "music";
    prompt: string;
    bytes: ArrayBuffer;
    mime: string;
    ext: string;
  },
): Promise<AiSavedCreation> {
  const { supabase, userId } = context;
  const path = `${userId}/${file.kind}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${file.ext}`;
  const upload = await supabase.storage
    .from(file.bucket)
    .upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (upload.error) {
    console.error(upload.error);
    throw new Error("La création a été générée mais n'a pas pu être enregistrée. Réessayez.");
  }
  const { data: row, error } = await supabase
    .from("ai_creations")
    .insert({ user_id: userId, kind: file.kind, prompt: file.prompt, media_path: path, mime_type: file.mime })
    .select("id")
    .single();
  if (error || !row) {
    console.error(error);
    await supabase.storage.from(file.bucket).remove([path]);
    throw new Error("La création n'a pas pu être ajoutée à votre historique. Réessayez.");
  }
  const signed = await supabase.storage.from(file.bucket).createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data) throw new Error("Aperçu indisponible. Retrouvez la création dans votre historique.");
  return { id: row.id, path, url: toBrowserUrl(signed.data.signedUrl), mime: file.mime };
}

/** Voix off générée par ElevenLabs (clé ELEVENLABS_API_KEY), enregistrée dans l'espace privé de l'utilisateur. */
export const generateAiVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_VOICE_TEXT_MAX),
        voiceId: z.enum(AI_VOICES.map((v) => v.id) as [string, ...string[]]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AiSavedCreation> => {
    const key = requireProviderKey("ELEVENLABS_API_KEY", "La voix off (ElevenLabs)");
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text, model_id: ELEVENLABS_MODEL }),
      },
    );
    if (!response.ok) throw await providerError("ElevenLabs", response);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("ElevenLabs n'a renvoyé aucun son.");
    return saveCreation(context, {
      bucket: "ai-audio",
      kind: "voice",
      prompt: data.text,
      bytes,
      mime: "audio/mpeg",
      ext: "mp3",
    });
  });

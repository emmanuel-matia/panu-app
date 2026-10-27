import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { bytesToBase64, providerError, requireProviderKey } from "./ai-providers.server";
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

/** Image générée par Fal.ai (FLUX) avec la clé personnelle FAL_API_KEY. */
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
  .handler(async ({ data }): Promise<{ url: string }> => {
    const key = requireProviderKey("FAL_API_KEY", "La génération d'images (Fal.ai)");
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
      images?: { url?: string }[];
      has_nsfw_concepts?: boolean[];
    };
    if (body.has_nsfw_concepts?.[0]) {
      throw new Error("L'image a été bloquée par les filtres de sécurité. Modifiez la description.");
    }
    const url = body.images?.[0]?.url;
    if (!url || !url.startsWith("https://")) {
      throw new Error("Fal.ai n'a renvoyé aucune image pour cette demande.");
    }
    return { url };
  });

/** Voix off générée par ElevenLabs avec la clé du projet ELEVENLABS_API_KEY. Réponse : MP3 en data URI. */
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
  .handler(async ({ data }): Promise<{ audio: string }> => {
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
    return { audio: `data:audio/mpeg;base64,${bytesToBase64(bytes)}` };
  });

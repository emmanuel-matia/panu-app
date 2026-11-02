import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

import {
  base64ToBytes,
  cloudflareRun,
  FAL_KEY_NAMES,
  firstSuccessful,
  optionalKey,
  providerError,
  requireProviderKey,
} from "./ai-providers.server";
import { withCredits } from "./credits.server";
import {
  AI_IMAGE_FORMATS,
  AI_MEDIA_PROMPT_MIN,
  AI_MUSIC_DURATIONS,
  AI_TEXT_PROMPT_MAX,
  AI_VOICE_TEXT_MAX,
  AI_VOICES,
} from "./media-rules";
import { toBrowserUrl } from "./supabase-public.server";
import {
  deleteInputPhoto,
  falPhotoRestyle,
  geminiPhotoEdit,
  loadRunnableTemplate,
  readInputPhoto,
  recordTemplateUse,
  stabilityPhotoRestyle,
} from "./templates.server";

const FAL_IMAGE_MODEL = "fal-ai/flux/schnell";
const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";
const LYRIA_MODEL = "lyria-3-clip-preview";

type Format = (typeof AI_IMAGE_FORMATS)[number];
const FAL_SIZE: Record<Format, string> = {
  portrait: "portrait_16_9",
  square: "square_hd",
  landscape: "landscape_16_9",
};
const STABILITY_RATIO: Record<Format, string> = { portrait: "9:16", square: "1:1", landscape: "16:9" };

type ImageBytes = { bytes: ArrayBuffer; mime: string };

async function stabilityImage(key: string, prompt: string, format: Format): Promise<ImageBytes> {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("aspect_ratio", STABILITY_RATIO[format]);
  form.append("output_format", "jpeg");
  const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "image/*" },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw await providerError("Stability AI", response);
  if (response.headers.get("finish-reason") === "CONTENT_FILTERED") {
    throw new Error("Stability AI a bloqué cette image (filtre de sécurité).");
  }
  return { bytes: await response.arrayBuffer(), mime: "image/jpeg" };
}

async function cloudflareImage(token: string, prompt: string): Promise<ImageBytes> {
  const response = await cloudflareRun(token, CLOUDFLARE_IMAGE_MODEL, { prompt, steps: 6 });
  if (!response.ok) throw await providerError("Cloudflare", response);
  const body = (await response.json()) as { result?: { image?: string } };
  if (!body.result?.image) throw new Error("Cloudflare n'a renvoyé aucune image.");
  return { bytes: base64ToBytes(body.result.image), mime: "image/jpeg" };
}

async function falImage(key: string, prompt: string, format: Format): Promise<ImageBytes> {
  const response = await fetch(`https://fal.run/${FAL_IMAGE_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_size: FAL_SIZE[format], num_images: 1, enable_safety_checker: true }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw await providerError("Fal.ai", response);
  const body = (await response.json()) as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] };
  if (body.has_nsfw_concepts?.[0]) throw new Error("Fal.ai a bloqué cette image (filtre de sécurité).");
  const remote = body.images?.[0]?.url;
  if (!remote?.startsWith("https://")) throw new Error("Fal.ai n'a renvoyé aucune image.");
  const file = await fetch(remote);
  if (!file.ok) throw new Error("Image Fal.ai impossible à récupérer.");
  return { bytes: await file.arrayBuffer(), mime: file.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
}

async function geminiImage(key: string, prompt: string, format: Format): Promise<ImageBytes> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: STABILITY_RATIO[format] } },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!response.ok) throw await providerError("Gemini", response);
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const image = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!image?.data) throw new Error("Gemini n'a renvoyé aucune image (demande peut-être bloquée).");
  return { bytes: base64ToBytes(image.data), mime: image.mimeType?.split(";")[0] || "image/png" };
}

const EXT: Record<string, string> = { "image/png": "png", "image/webp": "webp", "audio/wav": "wav" };

/**
 * Image du Studio IA : Fal.ai (FLUX), puis Gemini, Stability AI et Cloudflare Workers AI en secours.
 * L'image réussie est copiée dans l'espace privé de l'utilisateur et ajoutée à son historique.
 */
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
    const stability = optionalKey("STABILITY_API_KEY");
    const cloudflare = optionalKey("CLOUDFLARE_API_TOKEN");
    const fal = optionalKey(...FAL_KEY_NAMES);
    const gemini = optionalKey("GEMINI_API_KEY");
    const attempts = [
      ...(fal ? [{ provider: "Fal.ai", run: () => falImage(fal, data.prompt, data.format) }] : []),
      ...(gemini ? [{ provider: "Gemini", run: () => geminiImage(gemini, data.prompt, data.format) }] : []),
      ...(stability ? [{ provider: "Stability AI", run: () => stabilityImage(stability, data.prompt, data.format) }] : []),
      ...(cloudflare ? [{ provider: "Cloudflare", run: () => cloudflareImage(cloudflare, data.prompt) }] : []),
    ];
    return withCredits(context, "image", async () => {
      const { provider, result } = await firstSuccessful(attempts, "La génération d'images");
      const saved = await saveCreation(context, {
        bucket: "ai-images",
        kind: "image",
        prompt: data.prompt,
        bytes: result.bytes,
        mime: result.mime,
        ext: EXT[result.mime] ?? "jpg",
      });
      return { ...saved, provider };
    });
  });

export type AiSavedCreation = { id: string; path: string; url: string; mime: string; provider?: string };

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
    return withCredits(context, "voice", async () => {
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
      const saved = await saveCreation(context, {
        bucket: "ai-audio",
        kind: "voice",
        prompt: data.text,
        bytes,
        mime: "audio/mpeg",
        ext: "mp3",
      });
      return { ...saved, provider: "ElevenLabs" };
    });
  });

type AudioBytes = { bytes: ArrayBuffer; mime: string };

async function elevenMusic(key: string, prompt: string, seconds: number): Promise<AudioBytes> {
  const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, music_length_ms: seconds * 1000 }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw await providerError("ElevenLabs", response);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("ElevenLabs n'a renvoyé aucune musique.");
  return { bytes, mime: "audio/mpeg" };
}

async function lyriaMusic(key: string, prompt: string): Promise<AudioBytes> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${LYRIA_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(180_000),
    },
  );
  if (!response.ok) throw await providerError("Gemini Lyria", response);
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const audio = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!audio?.data) throw new Error("Gemini Lyria n'a renvoyé aucune musique.");
  return { bytes: base64ToBytes(audio.data), mime: audio.mimeType?.split(";")[0] || "audio/mpeg" };
}

/** Musique du Studio IA : ElevenLabs Music, puis Gemini Lyria en secours. */
export const generateAiMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_TEXT_PROMPT_MAX),
        seconds: z.union([
          z.literal(AI_MUSIC_DURATIONS[0]),
          z.literal(AI_MUSIC_DURATIONS[1]),
          z.literal(AI_MUSIC_DURATIONS[2]),
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AiSavedCreation> => {
    const eleven = optionalKey("ELEVENLABS_API_KEY");
    const gemini = optionalKey("GEMINI_API_KEY");
    const attempts = [
      ...(eleven ? [{ provider: "ElevenLabs", run: () => elevenMusic(eleven, data.prompt, data.seconds) }] : []),
      ...(gemini ? [{ provider: "Gemini Lyria", run: () => lyriaMusic(gemini, data.prompt) }] : []),
    ];
    return withCredits(context, "music", async () => {
      const { provider, result } = await firstSuccessful(attempts, "La génération de musique");
      const saved = await saveCreation(context, {
        bucket: "ai-audio",
        kind: "music",
        prompt: data.prompt,
        bytes: result.bytes,
        mime: result.mime,
        ext: EXT[result.mime] ?? "mp3",
      });
      return { ...saved, provider };
    });
  });

/**
 * Création d'une image ou d'une musique à partir d'un modèle PANU.
 * Le modèle (instructions, coût, type) est relu en base : le navigateur n'envoie que les réponses du formulaire.
 * Crédits débités avant, rendus si la génération échoue ; le compteur du modèle n'augmente qu'en cas de succès.
 */
export const runTemplateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
        inputs: z.record(z.string().max(100), z.string().max(700)),
        photoPath: z.string().max(200).optional(),
        format: z.enum(AI_IMAGE_FORMATS).optional(),
        seconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AiSavedCreation> => {
    const t = await loadRunnableTemplate(context, data.slug, data.inputs);
    if (t.kind === "video") throw new Error("Ce modèle crée une vidéo : lancez-le depuis sa page.");
    if (t.inputKind === "photo" && !data.photoPath) throw new Error("Ajoutez une photo pour utiliser ce modèle.");
    const format: Format = data.format ?? t.settings.format ?? "portrait";
    const seconds = data.seconds ?? t.settings.seconds ?? 30;
    try {
      return await withCredits(
        context,
        t.kind === "music" ? "music" : "image",
        async () => {
          let provider: string;
          let result: { bytes: ArrayBuffer; mime: string };
          if (t.kind === "music") {
            const eleven = optionalKey("ELEVENLABS_API_KEY");
            const gemini = optionalKey("GEMINI_API_KEY");
            ({ provider, result } = await firstSuccessful(
              [
                ...(eleven ? [{ provider: "ElevenLabs", run: () => elevenMusic(eleven, t.prompt, seconds) }] : []),
                ...(gemini ? [{ provider: "Gemini Lyria", run: () => lyriaMusic(gemini, t.prompt) }] : []),
              ],
              "La génération de musique",
            ));
          } else if (t.inputKind === "photo") {
            const photo = await readInputPhoto(context, data.photoPath as string);
            const gemini = optionalKey("GEMINI_API_KEY");
            const stability = optionalKey("STABILITY_API_KEY");
            const fal = optionalKey(...FAL_KEY_NAMES);
            ({ provider, result } = await firstSuccessful(
              [
                ...(gemini ? [{ provider: "Gemini", run: () => geminiPhotoEdit(gemini, t.prompt, photo, format) }] : []),
                ...(stability ? [{ provider: "Stability AI", run: () => stabilityPhotoRestyle(stability, t.prompt, photo) }] : []),
                ...(fal ? [{ provider: "Fal.ai", run: () => falPhotoRestyle(fal, t.prompt, photo) }] : []),
              ],
              "La retouche de photo",
            ));
          } else {
            const stability = optionalKey("STABILITY_API_KEY");
            const cloudflare = optionalKey("CLOUDFLARE_API_TOKEN");
            const fal = optionalKey(...FAL_KEY_NAMES);
            const gemini = optionalKey("GEMINI_API_KEY");
            ({ provider, result } = await firstSuccessful(
              [
                ...(fal ? [{ provider: "Fal.ai", run: () => falImage(fal, t.prompt, format) }] : []),
                ...(gemini ? [{ provider: "Gemini", run: () => geminiImage(gemini, t.prompt, format) }] : []),
                ...(stability ? [{ provider: "Stability AI", run: () => stabilityImage(stability, t.prompt, format) }] : []),
                ...(cloudflare ? [{ provider: "Cloudflare", run: () => cloudflareImage(cloudflare, t.prompt) }] : []),
              ],
              "La génération d'images",
            ));
          }
          const saved = await saveCreation(context, {
            bucket: t.kind === "music" ? "ai-audio" : "ai-images",
            kind: t.kind === "music" ? "music" : "image",
            prompt: t.summary,
            bytes: result.bytes,
            mime: result.mime,
            ext: EXT[result.mime] ?? (t.kind === "music" ? "mp3" : "jpg"),
          });
          await recordTemplateUse(t.id, context.userId, saved.id);
          return { ...saved, provider };
        },
        t.cost,
      );
    } finally {
      if (t.inputKind === "photo") await deleteInputPhoto(context, data.photoPath);
    }
  });

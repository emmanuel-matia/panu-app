/** Outils serveur des modèles IA : chargement du modèle, photo source temporaire, compteur d'utilisations. */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import { base64ToBytes, bytesToBase64, providerError } from "./ai-providers.server";
import {
  buildPrompt,
  creationSummary,
  parseFields,
  parseSettings,
  validateTemplateInputs,
  type TemplateInput,
  type TemplateKind,
  type TemplateSettings,
} from "./templates-rules";

export type TemplateCtx = { supabase: SupabaseClient<Database>; userId: string };
export type ImageBytes = { bytes: ArrayBuffer; mime: string };

export type RunnableTemplate = {
  id: string;
  slug: string;
  title: string;
  kind: TemplateKind;
  inputKind: TemplateInput;
  prompt: string;
  summary: string;
  settings: TemplateSettings;
  cost: number;
};

/** Charge un modèle publié et vérifie les réponses du formulaire ; construit l'instruction envoyée à l'IA. */
export async function loadRunnableTemplate(
  ctx: TemplateCtx,
  slug: string,
  rawInputs: Record<string, unknown>,
): Promise<RunnableTemplate> {
  const { data, error } = await ctx.supabase.rpc("get_template_for_run", { _slug: slug });
  const row = data?.[0];
  if (error || !row) throw new Error("Ce modèle n'est plus disponible.");
  const fields = parseFields(row.fields);
  const checked = validateTemplateInputs(fields, rawInputs);
  if (!checked.ok) throw new Error(checked.error);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind as TemplateKind,
    inputKind: row.input_kind as TemplateInput,
    prompt: buildPrompt(row.prompt_template, checked.values),
    summary: creationSummary(row.title, checked.values),
    settings: parseSettings(row.settings),
    cost: row.credit_cost,
  };
}

const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const PHOTO_PATH = /^[0-9a-f-]{36}\/input-[0-9]{10,16}-[a-z0-9]{4,12}\.jpg$/;

/** La photo source doit être dans le dossier privé de l'utilisateur (jamais celle d'un autre). */
export function assertOwnPhotoPath(userId: string, path: string): void {
  if (!path.startsWith(`${userId}/`) || !PHOTO_PATH.test(path)) throw new Error("Photo invalide. Choisissez-la à nouveau.");
}

export async function readInputPhoto(ctx: TemplateCtx, path: string): Promise<ImageBytes> {
  assertOwnPhotoPath(ctx.userId, path);
  const { data, error } = await ctx.supabase.storage.from("ai-images").download(path);
  if (error || !data) throw new Error("Photo introuvable. Choisissez-la à nouveau.");
  if (data.size === 0 || data.size > PHOTO_MAX_BYTES) throw new Error("Photo trop lourde ou vide (8 Mo maximum).");
  return { bytes: await data.arrayBuffer(), mime: "image/jpeg" };
}

/** Supprime la photo source temporaire (elle ne sert qu'à la création). */
export async function deleteInputPhoto(ctx: TemplateCtx, path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    assertOwnPhotoPath(ctx.userId, path);
    await ctx.supabase.storage.from("ai-images").remove([path]);
  } catch (e) {
    console.error("[templates] suppression de la photo source impossible", e);
  }
}

/** Compteur réel : une ligne par création réussie (idempotent), écrite par le serveur uniquement. */
export async function recordTemplateUse(templateId: string, userId: string, refId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_template_use", {
      _template_id: templateId,
      _user_id: userId,
      _ref: refId,
    });
    if (error) console.error("[templates] compteur d'utilisation", error);
  } catch (e) {
    console.error("[templates] compteur d'utilisation", e);
  }
}

/* ---------- Retouche d'une photo (modèles Photo IA avec photo) ---------- */

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const RATIO = { portrait: "3:4", square: "1:1", landscape: "4:3" } as const;
export type PhotoFormat = keyof typeof RATIO;

export async function geminiPhotoEdit(key: string, prompt: string, photo: ImageBytes, format: PhotoFormat): Promise<ImageBytes> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: photo.mime, data: bytesToBase64(photo.bytes) } }] },
        ],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: RATIO[format] } },
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

/** Stability AI « structure » : garde la composition et le visage de la photo, change le style. */
export async function stabilityPhotoRestyle(key: string, prompt: string, photo: ImageBytes): Promise<ImageBytes> {
  const form = new FormData();
  form.append("image", new Blob([photo.bytes], { type: photo.mime }), "photo.jpg");
  form.append("prompt", prompt.slice(0, 9000));
  form.append("control_strength", "0.75");
  form.append("output_format", "jpeg");
  const response = await fetch("https://api.stability.ai/v2beta/stable-image/control/structure", {
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

export async function falPhotoRestyle(key: string, prompt: string, photo: ImageBytes): Promise<ImageBytes> {
  const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_url: `data:${photo.mime};base64,${bytesToBase64(photo.bytes)}`,
      strength: 0.8,
      num_images: 1,
      enable_safety_checker: true,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw await providerError("Fal.ai", response);
  const body = (await response.json()) as { images?: { url?: string }[] };
  const remote = body.images?.[0]?.url;
  if (!remote?.startsWith("https://")) throw new Error("Fal.ai n'a renvoyé aucune image.");
  const file = await fetch(remote);
  if (!file.ok) throw new Error("Image Fal.ai impossible à récupérer.");
  return { bytes: await file.arrayBuffer(), mime: file.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
}

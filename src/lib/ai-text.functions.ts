import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { providerError } from "./ai-providers.server";
import { AI_MEDIA_PROMPT_MIN, AI_TEXT_PROMPT_MAX } from "./media-rules";

const GEMINI_MODEL = "gemini-flash-latest";
const OPENAI_MODEL = "gpt-5-mini";

const SYSTEM_PROMPT =
  "Tu es le Studio IA de PANU, une plateforme créative africaine. Réponds en français, " +
  "de façon claire et structurée (idées, scénarios, scripts, légendes, textes). " +
  "N'invente jamais de statistiques ni de faits présentés comme réels.";

/**
 * Génération de texte du Studio IA avec la clé personnelle du projet :
 * GEMINI_API_KEY (Google) en priorité, sinon OPENAI_API_KEY. Réponse : `{ data: texte }`.
 */
export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ prompt: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_TEXT_PROMPT_MAX) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ data: string }> => {
    const geminiKey = process.env["GEMINI_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];
    let text = "";

    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: data.prompt }] }],
          }),
        },
      );
      if (!response.ok) throw await providerError("Gemini", response);
      const body = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };
      if (body.promptFeedback?.blockReason) {
        throw new Error("Gemini a bloqué cette demande. Reformulez votre texte.");
      }
      text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    } else if (openaiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!response.ok) throw await providerError("OpenAI", response);
      const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
      text = body.choices?.[0]?.message?.content ?? "";
    } else {
      throw new Error(
        "Le Studio IA texte n'est pas configuré : enregistrez la clé GEMINI_API_KEY ou OPENAI_API_KEY.",
      );
    }

    const result = text.trim();
    if (!result) throw new Error("Le service IA n'a renvoyé aucun texte pour cette demande.");
    return { data: result };
  });

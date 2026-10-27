import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { AI_MEDIA_PROMPT_MIN, AI_TEXT_PROMPT_MAX } from "./media-rules";

const GATEWAY_URL = "https://ai.gateway.lovable.dev";
const TEXT_MODEL = "google/gemini-3.8-flash";

const SYSTEM_PROMPT =
  "Tu es le Studio IA de PANU, une plateforme créative africaine. Réponds en français, " +
  "de façon claire et structurée (idées, scénarios, scripts, légendes, textes). " +
  "N'invente jamais de statistiques ni de faits présentés comme réels.";

/**
 * Génération de texte du Studio IA (Gemini). Remplace l'Edge Function `generate-content` :
 * dans ce projet la logique serveur passe par des fonctions serveur. Réponse : `{ data: texte }`.
 */
export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ prompt: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_TEXT_PROMPT_MAX) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ data: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Le Studio IA n'est pas configuré (clé IA absente).");

    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      const detail = body?.message ?? "";
      if (response.status === 402) {
        throw new Error(detail || "Crédits IA insuffisants : ajoutez des crédits pour utiliser le Studio IA.");
      }
      if (response.status === 429) {
        throw new Error("Trop de demandes en même temps. Patientez quelques secondes puis réessayez.");
      }
      if (response.status === 403) {
        throw new Error(`Génération non autorisée pour cet espace. ${detail}`.trim());
      }
      if (response.status === 400) {
        throw new Error(`Demande refusée par le service IA. ${detail}`.trim());
      }
      throw new Error("Le Studio IA est momentanément indisponible. Réessayez plus tard.");
    }

    // Lecture du flux SSE et assemblage du texte final.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: { delta?: { content?: string | null } }[];
            error?: { message?: string };
          };
          if (chunk.error) throw new Error(chunk.error.message ?? "La génération a échoué.");
          text += chunk.choices?.[0]?.delta?.content ?? "";
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    const result = text.trim();
    if (!result) {
      throw new Error("Le service IA n'a renvoyé aucun texte pour cette demande.");
    }
    return { data: result };
  });

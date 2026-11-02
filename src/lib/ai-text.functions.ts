import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { cloudflareRun, firstSuccessful, optionalKey, providerError } from "./ai-providers.server";
import { withCredits } from "./credits.server";
import { loadRunnableTemplate } from "./templates.server";
import { cleanLyrics, lyricsLineCount, SONG_LANGUAGES, type SongLanguage } from "./templates-rules";
import { AI_MEDIA_PROMPT_MIN, AI_TEXT_PROMPT_MAX, AI_TEXT_PURPOSES } from "./media-rules";

/** Gemini rapide d'abord (réponse en 1 à 3 s), puis le modèle plus complet en secours. */
const GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const CLOUDFLARE_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const OPENROUTER_MODEL = "openrouter/free";
const OPENAI_MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT =
  "Tu es le Studio IA de PANU, une plateforme créative africaine. Réponds en français, " +
  "de façon claire et structurée. N'invente jamais de statistiques ni de faits présentés comme réels.";

const PURPOSE_PROMPTS: Record<(typeof AI_TEXT_PURPOSES)[number], string> = {
  libre: "Réponds à la demande de l'utilisateur.",
  publication:
    "Rédige une publication courte et engageante pour un réseau social (2 à 5 phrases), avec quelques emojis adaptés et 3 à 6 hashtags à la fin.",
  hashtags:
    "Propose uniquement une liste de 10 à 15 hashtags pertinents (en français et en anglais si utile), séparés par des espaces, sans autre texte.",
  scenario:
    "Écris un scénario structuré (titre, personnages, scènes numérotées avec dialogues) prêt à être filmé.",
};

type Chat = { system: string; user: string };

async function gemini(key: string, model: string, chat: Chat): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: chat.system }] },
        contents: [{ role: "user", parts: [{ text: chat.user }] }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) throw await providerError("Gemini", response);
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (body.promptFeedback?.blockReason) throw new Error("Gemini a bloqué cette demande.");
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function openAiCompatible(
  provider: string,
  url: string,
  key: string,
  model: string,
  chat: Chat,
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: chat.system },
        { role: "user", content: chat.user },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await providerError(provider, response);
  const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  return body.choices?.[0]?.message?.content ?? "";
}

async function cloudflareText(token: string, chat: Chat): Promise<string> {
  const response = await cloudflareRun(token, CLOUDFLARE_TEXT_MODEL, {
    messages: [
      { role: "system", content: chat.system },
      { role: "user", content: chat.user },
    ],
    max_tokens: 1500,
  });
  if (!response.ok) throw await providerError("Cloudflare", response);
  const body = (await response.json()) as { result?: { response?: string } };
  return body.result?.response ?? "";
}

function nonEmpty(provider: string, run: () => Promise<string>) {
  return {
    provider,
    run: async () => {
      const text = (await run()).trim();
      if (!text) throw new Error(`${provider} n'a renvoyé aucun texte.`);
      return text;
    },
  };
}

/** Moteurs de texte disponibles, dans l'ordre d'essai. */
function textAttempts(chat: Chat) {
  const geminiKey = optionalKey("GEMINI_API_KEY");
  const cloudflareKey = optionalKey("CLOUDFLARE_API_TOKEN");
  const openrouterKey = optionalKey("OPENROUTER_API_KEY");
  const openaiKey = optionalKey("OPENAI_API_KEY");

  const attempts = [
    ...(geminiKey ? GEMINI_MODELS.map((m) => nonEmpty("Gemini", () => gemini(geminiKey, m, chat))) : []),
    ...(cloudflareKey ? [nonEmpty("Cloudflare", () => cloudflareText(cloudflareKey, chat))] : []),
    ...(openrouterKey
      ? [
          nonEmpty("OpenRouter", () =>
            openAiCompatible(
              "OpenRouter",
              "https://openrouter.ai/api/v1/chat/completions",
              openrouterKey,
              OPENROUTER_MODEL,
              chat,
            ),
          ),
        ]
      : []),
    ...(openaiKey
      ? [
          nonEmpty("OpenAI", () =>
            openAiCompatible("OpenAI", "https://api.openai.com/v1/chat/completions", openaiKey, OPENAI_MODEL, chat),
          ),
        ]
      : []),
  ];
  return attempts;
}

/**
 * Génération de texte du Studio IA avec les clés personnelles du projet.
 * Ordre : Gemini, puis Cloudflare Workers AI, OpenRouter et OpenAI en secours.
 * Le texte réussi est enregistré dans l'historique de l'utilisateur. Réponse : `{ data: texte }`.
 */
export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(AI_MEDIA_PROMPT_MIN).max(AI_TEXT_PROMPT_MAX),
        purpose: z.enum(AI_TEXT_PURPOSES).default("libre"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ data: string; provider: string; id: string | null }> => {
    const chat: Chat = { system: `${SYSTEM_PROMPT} ${PURPOSE_PROMPTS[data.purpose]}`, user: data.prompt };
    const attempts = textAttempts(chat);

    const { provider, result } = await withCredits(context, "text", () =>
      firstSuccessful(attempts, "La génération de texte"),
    );

    const { data: row, error } = await context.supabase
      .from("ai_creations")
      .insert({ user_id: context.userId, kind: "text", prompt: data.prompt, text_result: result })
      .select("id")
      .single();
    if (error) console.error(error);
    return { data: result, provider, id: row?.id ?? null };
  });

/**
 * Paroles originales pour un modèle musique (1 crédit texte, rendu en cas d'échec).
 * Le style et le thème sont relus depuis le modèle en base ; les paroles restent modifiables par l'utilisateur.
 */
export const writeSongLyrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
        inputs: z.record(z.string().max(100), z.string().max(700)),
        language: z.enum(SONG_LANGUAGES.map((l) => l.id) as [SongLanguage, ...SongLanguage[]]),
        seconds: z.union([z.literal(15), z.literal(30), z.literal(60)]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ lyrics: string; provider: string }> => {
    const t = await loadRunnableTemplate(context, data.slug, data.inputs);
    if (t.kind !== "music") throw new Error("Ce modèle ne crée pas de chanson.");
    const lang = SONG_LANGUAGES.find((l) => l.id === data.language)?.label.split(" (")[0] ?? "Français";
    const lines = lyricsLineCount(data.seconds);
    const chat: Chat = {
      system:
        "Tu es parolier pour PANU. Écris des paroles de chanson 100 % originales : ne reprends jamais de paroles existantes, " +
        "ne cite aucun artiste réel ni marque. Pas de contenu haineux, violent ou sexuel. " +
        "Réponds uniquement avec les paroles, sans titre ni commentaire ni markdown, en indiquant les parties entre crochets " +
        "([Couplet], [Refrain]…).",
      user:
        `Chanson décrite ainsi : ${t.prompt}\nLangue des paroles : ${lang}.\n` +
        `Environ ${lines} lignes chantables au total (durée ${data.seconds} secondes), refrain facile à retenir.`,
    };
    const { provider, result } = await withCredits(context, "text", () =>
      firstSuccessful(textAttempts(chat), "L'écriture des paroles"),
    );
    const lyrics = cleanLyrics(result.replace(/[*#_`]/g, ""));
    if (!lyrics) throw new Error("Aucune parole n'a été écrite. Réessayez.");
    return { lyrics, provider };
  });

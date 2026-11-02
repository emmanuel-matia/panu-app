import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateAiImage, type AiSavedCreation } from "@/lib/ai-media.functions";
import { AI_CREDIT_COSTS } from "@/lib/credits";
import { AI_IMAGE_FORMATS, AI_TEXT_PROMPT_MAX, validateAiTextPrompt } from "@/lib/media-rules";

import { AiResultActions } from "./AiResultActions";
import { GenerationStatus } from "./GenerationStatus";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const FORMAT_LABELS: Record<(typeof AI_IMAGE_FORMATS)[number], string> = {
  portrait: "Vertical",
  square: "Carré",
  landscape: "Horizontal",
};

/** Studio IA — génération d'image (Fal.ai, puis Gemini, Stability AI et Cloudflare en secours). */
export function AiImagePanel() {
  const generate = useServerFn(generateAiImage);
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<(typeof AI_IMAGE_FORMATS)[number]>("portrait");
  const [result, setResult] = useState<AiSavedCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState<{ provider?: string | undefined; seconds: number } | null>(null);

  async function handleGenerate() {
    const promptError = validateAiTextPrompt(prompt);
    if (promptError) {
      setError(promptError);
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    const t0 = Date.now();
    setStartedAt(t0);
    setDone(null);
    try {
      const r = await generate({ data: { prompt: prompt.trim(), format } });
      setResult(r);
      setDone({ provider: r.provider, seconds: Math.round((Date.now() - t0) / 1000) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération a échoué. Réessayez.");
    } finally {
      setLoading(false);
      setStartedAt(null);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-history"] });
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface-gradient p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ImageIcon className="size-4 text-accent" /> Créer une image
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Décrivez le sujet, le style et les couleurs. L'image arrive en quelques secondes.
        </p>
      </div>
      <textarea
        value={prompt}
        maxLength={AI_TEXT_PROMPT_MAX}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        disabled={loading}
        placeholder="Ex. : Affiche d'un concert de rumba à Kinshasa, couleurs vives, style néon"
        className={`${inputClass} resize-none`}
      />
      <label className="block text-xs text-muted-foreground">
        Format
        <select
          value={format}
          disabled={loading}
          onChange={(e) => setFormat(e.target.value as (typeof AI_IMAGE_FORMATS)[number])}
          className={`${inputClass} mt-1`}
        >
          {AI_IMAGE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
      <GenerationStatus
        state={
          error
            ? { phase: "error", message: error }
            : startedAt !== null
              ? { phase: "running", label: "Création de l'image…", startedAt, hint: "Fal.ai d'abord, puis Gemini, Stability AI et Cloudflare si un fournisseur est indisponible." }
              : done
                ? { phase: "done", ...done }
                : { phase: "idle" }
        }
      />
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        {loading ? "Génération en cours…" : `Générer l'image · ${AI_CREDIT_COSTS.image} crédits`}
      </ActionButton>
      {result ? (
        <div className="space-y-3">
          <img src={result.url} alt={prompt.trim()} className="w-full rounded-xl border border-border object-contain" />
          {result.provider ? (
            <p className="text-center text-[0.6875rem] text-muted-foreground">Générée avec {result.provider}</p>
          ) : null}
          <AiResultActions url={result.url} mime={result.mime} kind="image" prompt={prompt.trim()} downloadName="panu-image" />
        </div>
      ) : null}
    </section>
  );
}

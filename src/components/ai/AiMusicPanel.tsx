import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Music2 } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateAiMusic, type AiSavedCreation } from "@/lib/ai-media.functions";
import { AI_CREDIT_COSTS } from "@/lib/credits";
import { AI_MUSIC_DURATIONS, AI_TEXT_PROMPT_MAX, validateAiTextPrompt } from "@/lib/media-rules";

import { AiResultActions } from "./AiResultActions";
import { GenerationStatus } from "./GenerationStatus";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Studio IA — musique (ElevenLabs Music, Gemini Lyria en secours). */
export function AiMusicPanel() {
  const generate = useServerFn(generateAiMusic);
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState<(typeof AI_MUSIC_DURATIONS)[number]>(30);
  const [result, setResult] = useState<AiSavedCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState<{ provider?: string | undefined; seconds: number } | null>(null);

  async function handleGenerate() {
    const problem = validateAiTextPrompt(prompt);
    if (problem) return setError(problem);
    setError(null);
    setResult(null);
    setLoading(true);
    const t0 = Date.now();
    setStartedAt(t0);
    setDone(null);
    try {
      const r = await generate({ data: { prompt: prompt.trim(), seconds } });
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
          <Music2 className="size-4 text-accent" /> Créer une musique
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Décrivez le style, l'ambiance et les instruments. Comptez jusqu'à 1 à 2 minutes.
        </p>
      </div>
      <textarea
        value={prompt}
        maxLength={AI_TEXT_PROMPT_MAX}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        disabled={loading}
        placeholder="Ex. : Afrobeat joyeux, percussions, guitare, 110 BPM, sans voix"
        className={`${inputClass} resize-none`}
      />
      <label className="block text-xs text-muted-foreground">
        Durée
        <select
          value={seconds}
          disabled={loading}
          onChange={(e) => setSeconds(Number(e.target.value) as (typeof AI_MUSIC_DURATIONS)[number])}
          className={`${inputClass} mt-1`}
        >
          {AI_MUSIC_DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} secondes
            </option>
          ))}
        </select>
      </label>
      <GenerationStatus
        state={
          error
            ? { phase: "error", message: error }
            : startedAt !== null
              ? { phase: "running", label: "Composition de la musique…", startedAt, hint: "ElevenLabs Music compose le morceau ; comptez 30 s à 2 min." }
              : done
                ? { phase: "done", ...done }
                : { phase: "idle" }
        }
      />
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Music2 className="size-4" />}
        {loading ? "Composition en cours…" : `Générer la musique · ${AI_CREDIT_COSTS.music} crédits`}
      </ActionButton>
      {result ? (
        <div className="space-y-3">
          <audio controls src={result.url} className="w-full" />
          <AiResultActions url={result.url} mime={result.mime} kind="audio" prompt={prompt.trim()} downloadName="panu-musique" />
        </div>
      ) : null}
    </section>
  );
}

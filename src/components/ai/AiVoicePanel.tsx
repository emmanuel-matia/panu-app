import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mic } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateAiVoice, type AiSavedCreation } from "@/lib/ai-media.functions";
import { AI_CREDIT_COSTS } from "@/lib/credits";
import { AI_MEDIA_PROMPT_MIN, AI_VOICE_TEXT_MAX, AI_VOICES } from "@/lib/media-rules";

import { AiResultActions } from "./AiResultActions";
import { GenerationStatus } from "./GenerationStatus";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Studio IA — voix off (ElevenLabs, clé du projet). */
export function AiVoicePanel() {
  const generate = useServerFn(generateAiVoice);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState<string>(AI_VOICES[0].id);
  const [audio, setAudio] = useState<AiSavedCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState<{ provider?: string | undefined; seconds: number } | null>(null);

  async function handleGenerate() {
    const value = text.trim();
    if (value.length < AI_MEDIA_PROMPT_MIN) {
      setError(`Écrivez au moins ${AI_MEDIA_PROMPT_MIN} caractères.`);
      return;
    }
    if (value.length > AI_VOICE_TEXT_MAX) {
      setError(`Le texte ne doit pas dépasser ${AI_VOICE_TEXT_MAX} caractères.`);
      return;
    }
    setError(null);
    setAudio(null);
    setLoading(true);
    const t0 = Date.now();
    setStartedAt(t0);
    setDone(null);
    try {
      const r = await generate({ data: { text: value, voiceId } });
      setAudio(r);
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
          <Mic className="size-4 text-accent" /> Voix off
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Écrivez le texte à lire et choisissez une voix.
        </p>
      </div>
      <textarea
        value={text}
        maxLength={AI_VOICE_TEXT_MAX}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        disabled={loading}
        placeholder="Ex. : Bienvenue sur PANU, la plateforme des créateurs africains."
        className={`${inputClass} resize-none`}
      />
      <label className="block text-xs text-muted-foreground">
        Voix
        <select
          value={voiceId}
          disabled={loading}
          onChange={(e) => setVoiceId(e.target.value)}
          className={`${inputClass} mt-1`}
        >
          {AI_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <GenerationStatus
        state={
          error
            ? { phase: "error", message: error }
            : startedAt !== null
              ? { phase: "running", label: "Enregistrement de la voix…", startedAt, hint: "ElevenLabs lit votre texte ; quelques secondes suffisent en général." }
              : done
                ? { phase: "done", ...done }
                : { phase: "idle" }
        }
      />
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
        {loading ? "Génération en cours…" : `Générer la voix · ${AI_CREDIT_COSTS.voice} crédits`}
      </ActionButton>
      {audio ? (
        <div className="space-y-3">
          <audio controls src={audio.url} className="w-full" />
          <AiResultActions url={audio.url} mime={audio.mime} kind="audio" prompt={text.trim()} downloadName="panu-voix.mp3" />
        </div>
      ) : null}
    </section>
  );
}

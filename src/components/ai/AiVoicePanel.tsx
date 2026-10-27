import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Mic } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateAiVoice } from "@/lib/ai-media.functions";
import { AI_MEDIA_PROMPT_MIN, AI_VOICE_TEXT_MAX, AI_VOICES } from "@/lib/media-rules";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Studio IA — voix off (ElevenLabs, clé du projet). */
export function AiVoicePanel() {
  const generate = useServerFn(generateAiVoice);
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState<string>(AI_VOICES[0].id);
  const [audio, setAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    try {
      const result = await generate({ data: { text: value, voiceId } });
      setAudio(result.audio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération a échoué. Réessayez.");
    } finally {
      setLoading(false);
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
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
        {loading ? "Génération en cours…" : "Générer la voix"}
      </ActionButton>
      {audio ? (
        <div className="space-y-2">
          <audio controls src={audio} className="w-full" />
          <a
            href={audio}
            download="panu-voix.mp3"
            className="flex items-center justify-center gap-2 text-sm font-medium text-accent"
          >
            <Download className="size-4" /> Télécharger le MP3
          </a>
        </div>
      ) : null}
    </section>
  );
}

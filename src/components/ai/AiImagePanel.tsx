import { useServerFn } from "@tanstack/react-start";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateAiImage } from "@/lib/ai-media.functions";
import { AI_IMAGE_FORMATS, AI_TEXT_PROMPT_MAX, validateAiTextPrompt } from "@/lib/media-rules";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const FORMAT_LABELS: Record<(typeof AI_IMAGE_FORMATS)[number], string> = {
  portrait: "Vertical",
  square: "Carré",
  landscape: "Horizontal",
};

/** Studio IA — génération d'image (Fal.ai, clé personnelle). */
export function AiImagePanel() {
  const generate = useServerFn(generateAiImage);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<(typeof AI_IMAGE_FORMATS)[number]>("portrait");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    const promptError = validateAiTextPrompt(prompt);
    if (promptError) {
      setError(promptError);
      return;
    }
    setError(null);
    setUrl(null);
    setLoading(true);
    try {
      const result = await generate({ data: { prompt: prompt.trim(), format } });
      setUrl(result.url);
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
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        {loading ? "Génération en cours…" : "Générer l'image"}
      </ActionButton>
      {url ? (
        <div className="space-y-2">
          <img
            src={url}
            alt={prompt.trim()}
            className="w-full rounded-xl border border-border object-contain"
          />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            className="flex items-center justify-center gap-2 text-sm font-medium text-accent"
          >
            <Download className="size-4" /> Ouvrir / télécharger l'image
          </a>
        </div>
      ) : null}
    </section>
  );
}

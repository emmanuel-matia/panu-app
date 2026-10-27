import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { generateContent } from "@/lib/ai-text.functions";
import { AI_TEXT_PROMPT_MAX, validateAiTextPrompt } from "@/lib/media-rules";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Studio IA — génération de texte (idées, scénarios, scripts, légendes) avec Gemini. */
export function AiTextPanel() {
  const generate = useServerFn(generateContent);
  const [userPrompt, setUserPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const promptError = validateAiTextPrompt(userPrompt);
    if (promptError) {
      setError(promptError);
      return;
    }
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    try {
      const data = await generate({ data: { prompt: userPrompt.trim() } });
      setResult(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération a échoué. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
      setError("Copie impossible sur cet appareil.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface-gradient p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="size-4 text-accent" /> Écrire avec l'IA
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Idées de vidéos, scénarios, scripts, légendes… Décrivez ce que vous voulez obtenir.
        </p>
      </div>
      <textarea
        value={userPrompt}
        maxLength={AI_TEXT_PROMPT_MAX}
        onChange={(e) => setUserPrompt(e.target.value)}
        rows={4}
        disabled={loading}
        placeholder="Ex. : Écris le scénario d'un court-métrage de 1 minute sur un jeune musicien à Kinshasa"
        className={`${inputClass} resize-none`}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ActionButton className="w-full gap-2" disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? "Génération en cours…" : "Générer"}
      </ActionButton>

      <div aria-live="polite" className="rounded-xl border border-border bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">Résultat</h3>
          {result ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1 text-xs font-medium text-accent"
            >
              <Copy className="size-3.5" /> {copied ? "Copié" : "Copier"}
            </button>
          ) : null}
        </div>
        {result ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {loading ? "Gemini rédige votre texte…" : "Le texte généré s'affichera ici."}
          </p>
        )}
      </div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins, FileAudio, Loader2, Mic2, Music, PenLine, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiResultActions } from "@/components/ai/AiResultActions";
import { GenerationStatus } from "@/components/ai/GenerationStatus";
import { ActionButton } from "@/components/common/ActionButton";
import { ClipMaker, ClipMediaPicker } from "@/components/templates/ClipMaker";
import { TemplateCover } from "@/components/templates/TemplateTile";
import { runTemplateMedia } from "@/lib/ai-media.functions";
import { writeSongLyrics } from "@/lib/ai-text.functions";
import { AI_CREDIT_COSTS } from "@/lib/credits";
import type { ClipSource } from "@/lib/music-clip";
import { checkClipAudio } from "@/lib/music-clip-rules";
import {
  costLabel,
  creationSummary,
  engineLabel,
  LYRICS_MAX,
  musicOptions,
  SONG_LANGUAGES,
  validateTemplateInputs,
  type SongLanguage,
  type TemplateCard,
} from "@/lib/templates-rules";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";

type Song =
  | { kind: "ai"; url: string; mime: string; provider: string; seconds: number; lyrics: string }
  | { kind: "own"; url: string; name: string };

function Choice({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold disabled:opacity-60",
        active ? "border-transparent bg-music text-primary-foreground" : "border-border bg-surface text-surface-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Création guidée d'un modèle musique : style, voix, paroles, durée, puis chanson IA et clip vertical. */
export function MusicStudio({
  template,
  balance,
  onFinished,
}: {
  template: TemplateCard;
  balance: number | null;
  onFinished: () => void;
}) {
  const runMedia = useServerFn(runTemplateMedia);
  const writeLyrics = useServerFn(writeSongLyrics);
  const opts = musicOptions(template.settings);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.fields.map((f) => [f.id, f.type === "select" ? (f.options?.[0] ?? "") : ""])),
  );
  const [source, setSource] = useState<"ai" | "own">("ai");
  const [vocals, setVocals] = useState<"sung" | "instrumental">(opts.vocals === "instrumental" ? "instrumental" : "sung");
  const [language, setLanguage] = useState<SongLanguage>("fr");
  const [lyrics, setLyrics] = useState("");
  const [seconds, setSeconds] = useState<15 | 30 | 60>(template.settings.seconds ?? 30);
  const [ownAudio, setOwnAudio] = useState<File | null>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<ClipSource[]>([]);

  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [autoClip, setAutoClip] = useState(false);

  const cost = template.creditCost;
  const short = source === "ai" && balance !== null && balance < cost;
  const summary = useMemo(() => creationSummary(template.title, values), [template.title, values]);
  const showLyrics = opts.lyrics && vocals === "sung";
  const running = busy || writing;

  useEffect(() => {
    return () => {
      if (song?.kind === "own") URL.revokeObjectURL(song.url);
    };
  }, [song]);

  async function handleWriteLyrics() {
    const checked = validateTemplateInputs(template.fields, values);
    if (!checked.ok) return setError(checked.error);
    setError(null);
    setWriting(true);
    try {
      const r = await writeLyrics({ data: { slug: template.slug, inputs: checked.values, language, seconds } });
      setLyrics(r.lyrics);
      onFinished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Les paroles n'ont pas pu être écrites.");
      onFinished();
    } finally {
      setWriting(false);
    }
  }

  function pickAudio(file: File | undefined) {
    if (!file) return;
    const problem = checkClipAudio(file);
    if (problem) return setError(problem);
    setError(null);
    setOwnAudio(file);
  }

  async function handleCreate() {
    setError(null);
    if (source === "own") {
      if (!ownAudio) return setError("Choisissez votre fichier audio.");
      if (media.length === 0) return setError("Ajoutez des photos ou des vidéos pour le clip.");
      setAutoClip(true);
      setSong({ kind: "own", url: URL.createObjectURL(ownAudio), name: ownAudio.name });
      return;
    }
    const checked = validateTemplateInputs(template.fields, values);
    if (!checked.ok) return setError(checked.error);
    setBusy(true);
    const begin = Date.now();
    setStartedAt(begin);
    try {
      const saved = await runMedia({
        data: {
          slug: template.slug,
          inputs: checked.values,
          seconds,
          vocals,
          language,
          ...(showLyrics && lyrics.trim() ? { lyrics: lyrics.trim() } : {}),
        },
      });
      setAutoClip(opts.clip && media.length > 0);
      setSong({
        kind: "ai",
        url: saved.url,
        mime: saved.mime,
        provider: saved.provider ?? "IA",
        seconds: Math.round((Date.now() - begin) / 1000),
        lyrics: showLyrics ? lyrics.trim() : "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La chanson n'a pas pu être créée.");
    } finally {
      setBusy(false);
      setStartedAt(null);
      onFinished();
    }
  }

  if (song) {
    return (
      <div className="space-y-4 px-4 py-5">
        {song.kind === "ai" ? (
          <>
            <GenerationStatus state={{ phase: "done", seconds: song.seconds, provider: song.provider }} />
            <div className="flex items-center gap-3 rounded-2xl bg-music p-3 text-primary-foreground">
              <TemplateCover template={template} className="size-14 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{template.title}</p>
                <p className="truncate text-xs opacity-90">{vocals === "sung" ? "Chanson avec voix" : "Instrumental"} · {summary}</p>
              </div>
            </div>
            <audio src={song.url} controls className="w-full" />
            {song.lyrics ? (
              <details className="rounded-2xl border border-border bg-surface p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-foreground">Paroles</summary>
                <p className="mt-2 whitespace-pre-line text-surface-foreground">{song.lyrics}</p>
              </details>
            ) : null}
            <AiResultActions url={song.url} mime={song.mime} kind="audio" prompt={summary} downloadName="panu-chanson" />
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm text-foreground">
            <FileAudio className="size-5 shrink-0 text-accent" /> <span className="min-w-0 truncate">{song.name}</span>
          </div>
        )}
        {opts.clip ? (
          <ClipMaker
            audioUrl={song.url}
            title={template.title}
            caption={summary}
            media={media}
            onMediaChange={setMedia}
            autoStart={autoClip}
          />
        ) : null}
        <div className="flex gap-2 pt-1">
          <ActionButton variant="outline" className="flex-1 gap-2" onClick={() => setSong(null)}>
            <RefreshCw className="size-4" /> Modifier les réglages
          </ActionButton>
          <Link to="/modeles/musique" className="flex h-10 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold text-surface-foreground">
            Autres modèles
          </Link>
        </div>
      </div>
    );
  }

  let step = 0;
  return (
    <div className="space-y-5 px-4 py-4">
      <div className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
        <TemplateCover template={template} className="h-24 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{template.title}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
          <p className="text-[0.6875rem] text-muted-foreground">IA : {engineLabel(template.kind, template.inputKind)}</p>
        </div>
      </div>

      {opts.clip ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{++step}. La musique</p>
          <div className="flex gap-2">
            <Choice active={source === "ai"} disabled={running} onClick={() => setSource("ai")}>
              <Sparkles className="size-4" /> Créer avec l'IA
            </Choice>
            <Choice active={source === "own"} disabled={running} onClick={() => setSource("own")}>
              <FileAudio className="size-4" /> Mon morceau
            </Choice>
          </div>
          {source === "own" ? (
            <div className="space-y-1.5">
              <input
                ref={audioInput}
                type="file"
                accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm"
                className="hidden"
                aria-label="Choisir votre fichier audio"
                onChange={(e) => {
                  pickAudio(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {ownAudio ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
                  <FileAudio className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate">{ownAudio.name}</span>
                  <button type="button" aria-label="Retirer le morceau" onClick={() => setOwnAudio(null)}>
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => audioInput.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-3 py-4 text-sm text-surface-foreground"
                >
                  <Music className="size-4 text-accent" /> Choisir un fichier audio (MP3, M4A, WAV…)
                </button>
              )}
              <p className="text-[0.6875rem] text-muted-foreground">
                Utilisez uniquement une musique dont vous avez les droits. Les 60 premières secondes servent au clip. Gratuit, sans IA.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {source === "ai" ? (
        <>
          <section className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{++step}. Style et ambiance</p>
            {template.fields.map((f) => (
              <label key={f.id} className="block text-xs text-muted-foreground">
                {f.label}
                {f.required ? "" : " (facultatif)"}
                {f.type === "select" ? (
                  <select value={values[f.id] ?? ""} disabled={running} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1`}>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={values[f.id] ?? ""} disabled={running} maxLength={600} rows={2} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1 resize-none`} />
                ) : (
                  <input value={values[f.id] ?? ""} disabled={running} maxLength={300} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1`} />
                )}
              </label>
            ))}
            <label className="block text-xs text-muted-foreground">
              Durée
              <select value={seconds} disabled={running} onChange={(e) => setSeconds(Number(e.target.value) as 15 | 30 | 60)} className={`${inputClass} mt-1`}>
                <option value={15}>15 secondes</option>
                <option value={30}>30 secondes</option>
                <option value={60}>60 secondes</option>
              </select>
            </label>
          </section>

          {template.settings.vocals ? (
            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{++step}. Voix et paroles</p>
              {opts.vocals === "choice" ? (
                <div className="flex gap-2">
                  <Choice active={vocals === "sung"} disabled={running} onClick={() => setVocals("sung")}>
                    <Mic2 className="size-4" /> Voix chantée
                  </Choice>
                  <Choice active={vocals === "instrumental"} disabled={running} onClick={() => setVocals("instrumental")}>
                    <Music className="size-4" /> Instrumental
                  </Choice>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{opts.vocals === "sung" ? "Ce modèle crée une chanson avec voix chantée." : "Ce modèle crée une musique instrumentale (sans voix)."}</p>
              )}
              {vocals === "sung" ? (
                <label className="block text-xs text-muted-foreground">
                  Langue du chant
                  <select value={language} disabled={running} onChange={(e) => setLanguage(e.target.value as SongLanguage)} className={`${inputClass} mt-1`}>
                    {SONG_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </label>
              ) : null}
              {showLyrics ? (
                <div className="space-y-1.5">
                  <label className="block text-xs text-muted-foreground">
                    Paroles (facultatif)
                    <textarea
                      value={lyrics}
                      disabled={running}
                      maxLength={LYRICS_MAX}
                      rows={6}
                      placeholder={"[Refrain]\nÉcrivez vos paroles ici, ou laissez l'IA les écrire."}
                      onChange={(e) => setLyrics(e.target.value)}
                      className={`${inputClass} mt-1 resize-y font-mono text-xs leading-relaxed`}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => void handleWriteLyrics()}
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-60"
                    >
                      {writing ? <Loader2 className="size-3.5 animate-spin" /> : lyrics ? <PenLine className="size-3.5" /> : <Wand2 className="size-3.5" />}
                      {writing ? "Écriture…" : lyrics ? "Réécrire avec l'IA" : "Écrire les paroles avec l'IA"} · {costLabel(AI_CREDIT_COSTS.text)}
                    </button>
                    <span className="text-[0.625rem] text-muted-foreground">{lyrics.length}/{LYRICS_MAX}</span>
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Sans paroles, l'IA chante des paroles qu'elle invente sur votre thème. N'utilisez pas les paroles d'une chanson existante.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {opts.clip ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {++step}. Photos ou vidéos du clip{source === "ai" ? " (facultatif)" : ""}
          </p>
          <ClipMediaPicker media={media} onChange={setMedia} disabled={running} onError={setError} />
        </section>
      ) : null}

      <GenerationStatus
        state={
          error
            ? { phase: "error", message: error }
            : busy && startedAt !== null
              ? {
                  phase: "running",
                  label: vocals === "sung" ? "L'IA compose et chante votre chanson…" : "L'IA compose votre musique…",
                  startedAt,
                  hint: "Comptez 10 secondes à 2 minutes selon la durée.",
                }
              : { phase: "idle" }
        }
      />

      <ActionButton className="w-full gap-2" disabled={running || short} onClick={() => void handleCreate()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy
          ? "Création en cours…"
          : source === "own"
            ? "Créer le clip · gratuit"
            : `Créer la ${vocals === "sung" ? "chanson" : "musique"} · ${costLabel(cost)}`}
      </ActionButton>
      {source === "ai" ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-muted-foreground">
          <Coins className="size-3.5 text-gold" />
          {short
            ? `Crédits insuffisants : il vous en faut ${cost}, vous en avez ${balance}.`
            : `Débité au lancement${balance !== null ? ` · solde ${balance}` : ""} · remboursé si la création échoue. Le clip est gratuit.`}
        </p>
      ) : null}
    </div>
  );
}

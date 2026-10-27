import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { AiTextPanel } from "@/components/ai/AiTextPanel";
import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { useTrimPlayback, VideoOverlayText } from "@/components/video/TrimmedVideo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkAiVideo, startAiVideo } from "@/lib/video-ai.functions";
import { uploadVideoWithProgress } from "@/lib/video-upload";
import {
  AI_DURATIONS,
  AI_PROMPT_MAX,
  clampTrim,
  resolveVideoMime,
  validateAiPrompt,
  validateVideoFile,
  validateVideoPostFields,
  VIDEO_CAPTION_MAX,
  VIDEO_OVERLAY_MAX,
  VIDEO_TITLE_MAX,
  videoStoragePath,
} from "@/lib/video-rules";

export const Route = createFileRoute("/_authenticated/creer_/video")({
  // `?mode=ai` ouvre directement l'onglet « Créer avec l'IA » (accès Studio IA).
  validateSearch: (search: Record<string, unknown>): { mode?: "ai" } =>
    search["mode"] === "ai" ? { mode: "ai" } : {},
  head: () => ({
    meta: [
      { title: "Studio vidéo — PANU" },
      {
        name: "description",
        content:
          "Importez une vidéo depuis votre téléphone ou créez-la avec l'IA, montez-la et publiez-la sur PANU.",
      },
      { property: "og:title", content: "Studio vidéo — PANU" },
      {
        property: "og:description",
        content: "Importer, découper, titrer et publier vos vidéos sur PANU.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideoStudioPage,
});

type Selected =
  | { kind: "file"; file: File; mime: string; url: string }
  | { kind: "ai"; videoPath: string; url: string };

type PublishState =
  | { step: "idle" }
  | { step: "uploading"; progress: number }
  | { step: "saving" }
  | { step: "done" }
  | { step: "error"; message: string };

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function formatTime(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

function VideoStudioPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { mode: searchMode } = Route.useSearch();
  const [mode, setMode] = useState<"import" | "ai">(searchMode === "ai" ? "ai" : "import");
  useEffect(() => {
    if (searchMode === "ai") setMode("ai");
  }, [searchMode]);
  const [aiKind, setAiKind] = useState<"video" | "text">("video");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [volume, setVolume] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [publish, setPublish] = useState<PublishState>({ step: "idle" });

  useTrimPlayback(videoRef, trim.start, duration ? trim.end : null, volume);

  // Libère l'aperçu local quand on change de vidéo.
  useEffect(() => {
    const current = selected;
    return () => {
      if (current?.kind === "file") URL.revokeObjectURL(current.url);
    };
  }, [selected]);

  function resetEditor() {
    setSelected(null);
    setDuration(0);
    setTrim({ start: 0, end: 0 });
    setVolume(1);
    setPlaying(false);
    setPublish({ step: "idle" });
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = validateVideoFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    resetEditor();
    setSelected({
      kind: "file",
      file,
      mime: resolveVideoMime(file) ?? "video/mp4",
      url: URL.createObjectURL(file),
    });
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  async function handlePublish() {
    if (!user || !selected) return;
    const fieldsError = validateVideoPostFields({ title, caption, overlayText });
    if (fieldsError) {
      setPublish({ step: "error", message: fieldsError });
      return;
    }

    let videoPath: string;
    let uploadedHere = false;
    try {
      if (selected.kind === "file") {
        videoPath = videoStoragePath(user.id, selected.mime, Date.now());
        setPublish({ step: "uploading", progress: 0 });
        await uploadVideoWithProgress(videoPath, selected.file, selected.mime, (progress) =>
          setPublish({ step: "uploading", progress }),
        );
        uploadedHere = true;
      } else {
        videoPath = selected.videoPath;
      }
    } catch (error) {
      setPublish({
        step: "error",
        message: error instanceof Error ? error.message : "L'envoi de la vidéo a échoué.",
      });
      return;
    }

    setPublish({ step: "saving" });
    const fullLength = duration > 0 && trim.end >= duration - 0.05;
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      kind: "video",
      source: selected.kind === "ai" ? "ai" : "upload",
      title: title.trim(),
      caption: caption.trim() || null,
      video_path: videoPath,
      trim_start: Number(trim.start.toFixed(2)),
      trim_end: fullLength || duration === 0 ? null : Number(trim.end.toFixed(2)),
      volume: Number(volume.toFixed(2)),
      overlay_text: overlayText.trim() || null,
    });
    if (error) {
      console.error(error);
      if (uploadedHere) await supabase.storage.from("videos").remove([videoPath]);
      setPublish({
        step: "error",
        message: "La publication n'a pas pu être enregistrée. Réessayez.",
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
    setPublish({ step: "done" });
  }

  const busy = publish.step === "uploading" || publish.step === "saving";

  if (publish.step === "done") {
    return (
      <AppShell title="Vidéo publiée">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <CheckCircle2 className="size-14 text-accent" strokeWidth={1.5} />
          <h2 className="mt-5 text-lg font-semibold text-foreground">Votre vidéo est en ligne</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Elle apparaît maintenant dans l'accueil PANU et sur votre profil.
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <Link to="/">
              <ActionButton className="w-full">Voir dans l'accueil</ActionButton>
            </Link>
            <ActionButton
              variant="outline"
              onClick={() => {
                resetEditor();
                setTitle("");
                setCaption("");
                setOverlayText("");
              }}
            >
              Publier une autre vidéo
            </ActionButton>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Studio vidéo"
      subtitle="Importer, monter et publier"
      headerAction={
        <Link
          to="/creer"
          aria-label="Retour"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-5 px-4 py-5">
        {!selected ? (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
              {(
                [
                  ["import", "Importer", Upload],
                  ["ai", "Créer avec l'IA", Sparkles],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={
                    mode === value
                      ? "flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-primary-foreground"
                      : "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>

            {mode === "import" ? (
              <section className="rounded-2xl border border-dashed border-border bg-surface-gradient px-5 py-10 text-center">
                <Upload className="mx-auto size-10 text-accent" strokeWidth={1.5} />
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  Importer depuis votre téléphone
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">MP4, WebM ou MOV · 50 Mo maximum</p>
                <ActionButton className="mt-5" onClick={() => fileInput.current?.click()}>
                  Choisir une vidéo
                </ActionButton>
                {fileError ? (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    {fileError}
                  </p>
                ) : null}
              </section>
            ) : (
              <>
                <div className="flex gap-2">
                  {(
                    [
                      ["video", "Vidéo"],
                      ["text", "Texte"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAiKind(value)}
                      className={
                        aiKind === value
                          ? "rounded-full bg-accent/20 px-4 py-1.5 text-xs font-semibold text-accent"
                          : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {aiKind === "text" ? (
                  <AiTextPanel />
                ) : (
                  <AiVideoPanel
                    onReady={(videoPath, url) => {
                      resetEditor();
                      setSelected({ kind: "ai", videoPath, url });
                    }}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
              <video
                ref={videoRef}
                src={selected.url}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) {
                    setDuration(d);
                    setTrim({ start: 0, end: d });
                  }
                  setFileError(null);
                }}
                onError={() =>
                  setFileError(
                    "Cette vidéo ne peut pas être lue par votre navigateur. Essayez un fichier MP4.",
                  )
                }
                className="max-h-[60vh] w-full bg-background object-contain"
              />
              <VideoOverlayText text={overlayText} />
            </div>
            {fileError ? (
              <p role="alert" className="text-sm text-destructive">
                {fileError}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <ActionButton onClick={togglePlay} className="flex-1 gap-2" disabled={!duration}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                {playing ? "Pause" : "Lecture"}
              </ActionButton>
              {selected.kind === "file" ? (
                <ActionButton
                  variant="outline"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  <RefreshCw className="size-4" /> Changer
                </ActionButton>
              ) : null}
              <ActionButton
                variant="outline"
                className="gap-2"
                disabled={busy}
                onClick={resetEditor}
              >
                <X className="size-4" /> Annuler
              </ActionButton>
            </div>

            {duration > 0 ? (
              <section className="space-y-4 rounded-2xl border border-border bg-surface-gradient p-4">
                <h2 className="text-sm font-semibold text-foreground">Montage</h2>
                <label className="block text-xs text-muted-foreground">
                  Début : {formatTime(trim.start)}
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trim.start}
                    onChange={(e) => {
                      const next = clampTrim(Number(e.target.value), trim.end, duration);
                      setTrim(next);
                      if (videoRef.current) videoRef.current.currentTime = next.start;
                    }}
                    className="mt-1 w-full accent-primary"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Fin : {formatTime(trim.end)}
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trim.end}
                    onChange={(e) => {
                      const next = clampTrim(trim.start, Number(e.target.value), duration);
                      setTrim(next);
                      if (videoRef.current) videoRef.current.currentTime = Math.max(next.start, next.end - 1);
                    }}
                    className="mt-1 w-full accent-primary"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Durée publiée : {formatTime(trim.end - trim.start)} sur {formatTime(duration)}
                </p>
                <label className="block text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="size-3.5" /> Volume : {Math.round(volume * 100)} %
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="mt-1 w-full accent-primary"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Texte sur la vidéo
                  <input
                    value={overlayText}
                    maxLength={VIDEO_OVERLAY_MAX}
                    onChange={(e) => setOverlayText(e.target.value)}
                    placeholder="Ex. : Mon premier tournage"
                    className={`${inputClass} mt-1`}
                  />
                </label>
              </section>
            ) : null}

            <section className="space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Titre *
                <input
                  value={title}
                  maxLength={VIDEO_TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Donnez un titre à votre vidéo"
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Légende
                <textarea
                  value={caption}
                  maxLength={VIDEO_CAPTION_MAX}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Décrivez votre vidéo (facultatif)"
                  className={`${inputClass} mt-1 resize-none`}
                />
              </label>
            </section>

            {publish.step === "uploading" ? (
              <div aria-live="polite" className="space-y-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-brand transition-all"
                    style={{ width: `${publish.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Envoi de la vidéo… {publish.progress} %</p>
              </div>
            ) : null}
            {publish.step === "saving" ? (
              <p aria-live="polite" className="text-xs text-muted-foreground">
                Enregistrement de la publication…
              </p>
            ) : null}
            {publish.step === "error" ? (
              <p role="alert" className="text-sm text-destructive">
                {publish.message}
              </p>
            ) : null}

            <ActionButton
              className="w-full gap-2"
              disabled={busy || !duration || Boolean(fileError)}
              onClick={() => void handlePublish()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Publier la vidéo
            </ActionButton>
          </>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.mov,.webm,.m4v"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </AppShell>
  );
}

function AiVideoPanel({ onReady }: { onReady: (videoPath: string, url: string) => void }) {
  const start = useServerFn(startAiVideo);
  const check = useServerFn(checkAiVideo);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<(typeof AI_DURATIONS)[number]>(6);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const result = await check({ data: { jobId } });
        if (cancelled) return;
        if (result.status === "completed") {
          setJobId(null);
          onReadyRef.current(result.videoPath, result.videoUrl);
          return;
        }
        if (result.status === "failed") {
          setJobId(null);
          setStatus(null);
          setError(result.error);
          return;
        }
        setStatus(
          result.status === "queued"
            ? "En file d'attente…"
            : `Génération en cours${result.progress ? ` (${Math.round(result.progress)} %)` : "…"}`,
        );
        timer = setTimeout(() => void tick(), 7000);
      } catch (e) {
        if (cancelled) return;
        setJobId(null);
        setStatus(null);
        setError(e instanceof Error ? e.message : "Suivi de la génération impossible.");
      }
    };
    timer = setTimeout(() => void tick(), 5000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, check]);

  async function handleGenerate() {
    const promptError = validateAiPrompt(prompt);
    if (promptError) {
      setError(promptError);
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const result = await start({ data: { prompt: prompt.trim(), duration, aspectRatio } });
      setStatus("Génération lancée…");
      setJobId(result.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération n'a pas pu démarrer.");
    } finally {
      setStarting(false);
    }
  }

  const running = starting || Boolean(jobId);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface-gradient p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="size-4 text-accent" /> Créer avec l'IA
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Décrivez la scène, l'ambiance et le son souhaité. La génération prend en général 1 à 3
          minutes.
        </p>
      </div>
      <textarea
        value={prompt}
        maxLength={AI_PROMPT_MAX}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        disabled={running}
        placeholder="Ex. : Coucher de soleil sur le fleuve Congo, pirogue qui glisse lentement, musique douce de likembé"
        className={`${inputClass} resize-none`}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-muted-foreground">
          Durée
          <select
            value={duration}
            disabled={running}
            onChange={(e) => setDuration(Number(e.target.value) as (typeof AI_DURATIONS)[number])}
            className={`${inputClass} mt-1`}
          >
            {AI_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} secondes
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Format
          <select
            value={aspectRatio}
            disabled={running}
            onChange={(e) => setAspectRatio(e.target.value as "9:16" | "16:9")}
            className={`${inputClass} mt-1`}
          >
            <option value="9:16">Vertical (9:16)</option>
            <option value="16:9">Horizontal (16:9)</option>
          </select>
        </label>
      </div>
      {status ? (
        <p aria-live="polite" className="flex items-center gap-2 text-sm text-foreground">
          <Loader2 className="size-4 animate-spin text-accent" /> {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ActionButton className="w-full gap-2" disabled={running} onClick={() => void handleGenerate()}>
        <Sparkles className="size-4" />
        {running ? "Génération en cours…" : "Générer la vidéo"}
      </ActionButton>
    </section>
  );
}

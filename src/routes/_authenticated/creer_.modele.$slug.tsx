import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, Coins, Download, Loader2, PencilLine, RefreshCw, SearchX, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { AiResultActions } from "@/components/ai/AiResultActions";
import { GenerationStatus } from "@/components/ai/GenerationStatus";
import { ActionButton } from "@/components/common/ActionButton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateCover } from "@/components/templates/TemplateTile";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { runTemplateMedia, type AiSavedCreation } from "@/lib/ai-media.functions";
import { AI_IMAGE_FORMATS } from "@/lib/media-rules";
import { TEMPLATE_PHOTO_PICK_MAX, TEMPLATE_PHOTO_TYPES, uploadTemplatePhoto } from "@/lib/template-photo";
import { templatesQuery } from "@/lib/templates";
import {
  categoryLabel,
  costLabel,
  creationSummary,
  engineLabel,
  validateTemplateInputs,
  type TemplateCard,
} from "@/lib/templates-rules";
import { checkAiVideo, startTemplateVideo } from "@/lib/video-ai.functions";

export const Route = createFileRoute("/_authenticated/creer_/modele/$slug")({
  validateSearch: z.object({ job: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Créer avec un modèle — PANU" },
      { name: "description", content: "Ajoutez votre photo ou votre texte : l'IA crée votre vidéo, image ou musique à partir du modèle." },
      { property: "og:title", content: "Créer avec un modèle — PANU" },
      { property: "og:description", content: "Choisissez vos réglages et laissez l'IA créer." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UseTemplatePage,
});

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";
const FORMAT_LABELS = { portrait: "Portrait (3:4)", square: "Carré (1:1)", landscape: "Paysage (4:3)" } as const;

type Result =
  | { kind: "media"; saved: AiSavedCreation; seconds: number }
  | { kind: "video"; jobId: string; url: string; provider: string; seconds: number };

function UseTemplatePage() {
  const { slug } = Route.useParams();
  const { job } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate({ from: "/creer/modele/$slug" });
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery(user?.id ?? null));
  const template = templates.data?.find((t) => t.slug === slug);
  const credits = useCredits();

  const back = (
    <Link to="/modeles/$slug" params={{ slug }} aria-label="Retour au modèle" className="flex size-9 items-center justify-center rounded-full border border-border text-foreground">
      <ArrowLeft className="size-4" />
    </Link>
  );

  if (templates.isPending) {
    return (
      <AppShell title="Créer" headerAction={back}>
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }
  if (!template) {
    return (
      <AppShell title="Créer" headerAction={back}>
        <EmptyState icon={SearchX} title="Modèle introuvable" description="Ce modèle n'existe pas ou a été désactivé." />
      </AppShell>
    );
  }
  return (
    <AppShell title={template.title} subtitle={categoryLabel(template.category)} headerAction={back}>
      <TemplateRunner
        key={template.id}
        template={template}
        balance={credits.data?.balance ?? null}
        resumeJob={job}
        onJob={(id) => void navigate({ search: { job: id }, replace: true })}
        onFinished={() => {
          void queryClient.invalidateQueries({ queryKey: ["credits"] });
          void queryClient.invalidateQueries({ queryKey: ["templates"] });
          void queryClient.invalidateQueries({ queryKey: ["ai-creations"] });
        }}
      />
    </AppShell>
  );
}

function TemplateRunner({
  template,
  balance,
  resumeJob,
  onJob,
  onFinished,
}: {
  template: TemplateCard;
  balance: number | null;
  resumeJob: string | undefined;
  onJob: (id: string) => void;
  onFinished: () => void;
}) {
  const { user } = useAuth();
  const runMedia = useServerFn(runTemplateMedia);
  const startVideo = useServerFn(startTemplateVideo);
  const checkVideo = useServerFn(checkAiVideo);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.fields.map((f) => [f.id, f.type === "select" ? (f.options?.[0] ?? "") : ""])),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<(typeof AI_IMAGE_FORMATS)[number]>(template.settings.format ?? "portrait");
  const [aspect, setAspect] = useState<"9:16" | "16:9">(template.settings.aspect ?? "9:16");
  const [duration, setDuration] = useState<5 | 10>(template.settings.duration ?? 5);
  const [seconds, setSeconds] = useState<15 | 30 | 60>(template.settings.seconds ?? 30);

  const [label, setLabel] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(resumeJob ? Date.now() : null);
  const [jobId, setJobId] = useState<string | null>(resumeJob ?? null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) return setPhotoUrl(null);
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const needsPhoto = template.inputKind === "photo";
  const running = busy || Boolean(jobId);
  const cost = template.creditCost;
  const short = balance !== null && balance < cost;
  const summary = useMemo(() => creationSummary(template.title, values), [template.title, values]);
  const startRef = useRef(startedAt);
  startRef.current = startedAt;
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  // Suivi d'une vidéo en cours (aussi après un rechargement de la page grâce à `?job=`).
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLabel((l) => l ?? "Reprise du suivi de votre vidéo…");
    const tick = async () => {
      try {
        const r = await checkVideo({ data: { jobId } });
        if (cancelled) return;
        if (r.status === "completed") {
          const seconds = Math.round((Date.now() - (startRef.current ?? Date.now())) / 1000);
          setResult({ kind: "video", jobId, url: r.videoUrl, provider: r.provider, seconds });
          setJobId(null);
          setStartedAt(null);
          setLabel(null);
          finishedRef.current();
          return;
        }
        if (r.status === "failed") {
          setError(r.error);
          setJobId(null);
          setStartedAt(null);
          setLabel(null);
          finishedRef.current();
          return;
        }
        setLabel(
          r.status === "queued"
            ? `En file d'attente chez ${r.provider}${r.queuePosition !== null ? ` (position ${r.queuePosition + 1})` : ""}`
            : `${r.provider} crée votre vidéo…`,
        );
        timer = setTimeout(() => void tick(), 5000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Suivi de la création impossible.");
        setJobId(null);
        setStartedAt(null);
        setLabel(null);
      }
    };
    timer = setTimeout(() => void tick(), 3000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, checkVideo]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!TEMPLATE_PHOTO_TYPES.includes(file.type)) return setError("Choisissez une photo JPEG, PNG ou WebP.");
    if (file.size > TEMPLATE_PHOTO_PICK_MAX) return setError("Photo trop lourde (15 Mo maximum).");
    setError(null);
    setPhoto(file);
  }

  async function handleCreate() {
    if (!user) return;
    const checked = validateTemplateInputs(template.fields, values);
    if (!checked.ok) return setError(checked.error);
    if (needsPhoto && !photo) return setError("Ajoutez une photo pour utiliser ce modèle.");
    setError(null);
    setResult(null);
    setBusy(true);
    const begin = Date.now();
    setStartedAt(begin);
    try {
      let photoPath: string | undefined;
      if (needsPhoto && photo) {
        setLabel("Envoi de votre photo…");
        photoPath = await uploadTemplatePhoto(user.id, photo);
      }
      setLabel("Envoi des instructions à l'IA…");
      if (template.kind === "video") {
        const started = await startVideo({
          data: {
            slug: template.slug,
            inputs: checked.values,
            ...(photoPath ? { photoPath } : {}),
            duration,
            ...(needsPhoto ? {} : { aspectRatio: aspect }),
          },
        });
        setLabel(`Création lancée chez ${started.provider}`);
        setJobId(started.jobId);
        onJob(started.jobId);
      } else {
        setLabel(template.kind === "music" ? "L'IA compose votre musique…" : "L'IA crée votre image…");
        const saved = await runMedia({
          data: {
            slug: template.slug,
            inputs: checked.values,
            ...(photoPath ? { photoPath } : {}),
            ...(template.kind === "image" ? { format } : { seconds }),
          },
        });
        setResult({ kind: "media", saved, seconds: Math.round((Date.now() - begin) / 1000) });
        setStartedAt(null);
        setLabel(null);
        onFinished();
      }
    } catch (e) {
      setStartedAt(null);
      setLabel(null);
      setError(e instanceof Error ? e.message : "La création n'a pas pu démarrer.");
      onFinished();
    } finally {
      setBusy(false);
    }
  }

  function resetToForm() {
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="space-y-4 px-4 py-5">
        <GenerationStatus
          state={{ phase: "done", seconds: result.seconds, provider: result.kind === "video" ? result.provider : result.saved.provider }}
        />
        {result.kind === "video" ? (
          <>
            <video src={result.url} controls playsInline loop className="mx-auto max-h-[60vh] w-full rounded-2xl border border-border bg-background" />
            <Link
              to="/creer/video"
              search={{ edit: result.jobId }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-primary-foreground"
            >
              <PencilLine className="size-4" /> Modifier et publier
            </Link>
            <a
              href={`${result.url}${result.url.includes("?") ? "&" : "?"}download=panu-video.mp4`}
              className="flex items-center justify-center gap-2 text-sm font-medium text-accent"
            >
              <Download className="size-4" /> Télécharger
            </a>
            <p className="text-center text-[0.6875rem] text-muted-foreground">Enregistrée dans votre espace privé. Vous la publiez depuis l'éditeur.</p>
          </>
        ) : template.kind === "image" ? (
          <>
            <img src={result.saved.url} alt={template.title} className="w-full rounded-2xl border border-border object-contain" />
            <AiResultActions url={result.saved.url} mime={result.saved.mime} kind="image" prompt={summary} downloadName="panu-image" />
          </>
        ) : (
          <>
            <audio src={result.saved.url} controls className="w-full" />
            <AiResultActions url={result.saved.url} mime={result.saved.mime} kind="audio" prompt={summary} downloadName="panu-musique" />
          </>
        )}
        <div className="flex gap-2 pt-2">
          <ActionButton variant="outline" className="flex-1 gap-2" onClick={resetToForm}>
            <RefreshCw className="size-4" /> Modifier les réglages
          </ActionButton>
          <Link to="/modeles" className="flex h-10 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold text-surface-foreground">
            Autres modèles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
        <TemplateCover template={template} className="h-24 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{template.title}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
          <p className="text-[0.6875rem] text-muted-foreground">IA : {engineLabel(template.kind, template.inputKind)}</p>
        </div>
      </div>

      {needsPhoto ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-foreground">1. Votre photo</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {photoUrl ? (
            <div className="relative mx-auto w-40">
              <img src={photoUrl} alt="Votre photo" className="aspect-[4/5] w-full rounded-2xl border border-border object-cover" />
              <button
                type="button"
                disabled={running}
                onClick={() => setPhoto(null)}
                aria-label="Retirer la photo"
                className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={running}
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-sm text-surface-foreground"
            >
              <Camera className="size-7 text-accent" />
              Choisir une photo
              <span className="text-[0.6875rem] text-muted-foreground">JPEG, PNG ou WebP · 15 Mo max</span>
            </button>
          )}
          <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
            Votre photo est envoyée au moteur IA pour créer le résultat, puis supprimée de PANU juste après. Utilisez uniquement des photos
            dont vous avez le droit de vous servir.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{needsPhoto ? "2. Vos choix" : "1. Vos choix"}</p>
        {template.fields.map((f) => (
          <label key={f.id} className="block text-xs text-muted-foreground">
            {f.label}
            {f.required ? "" : " (facultatif)"}
            {f.type === "select" ? (
              <select value={values[f.id] ?? ""} disabled={running} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1`}>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea value={values[f.id] ?? ""} disabled={running} maxLength={600} rows={3} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1 resize-none`} />
            ) : (
              <input value={values[f.id] ?? ""} disabled={running} maxLength={300} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={`${inputClass} mt-1`} />
            )}
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {template.kind === "image" ? (
            <label className="block text-xs text-muted-foreground">
              Format
              <select value={format} disabled={running} onChange={(e) => setFormat(e.target.value as typeof format)} className={`${inputClass} mt-1`}>
                {AI_IMAGE_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
              </select>
            </label>
          ) : null}
          {template.kind === "video" ? (
            <>
              <label className="block text-xs text-muted-foreground">
                Durée
                <select value={duration} disabled={running} onChange={(e) => setDuration(Number(e.target.value) as 5 | 10)} className={`${inputClass} mt-1`}>
                  <option value={5}>5 secondes</option>
                  <option value={10}>10 secondes</option>
                </select>
              </label>
              {!needsPhoto ? (
                <label className="block text-xs text-muted-foreground">
                  Format
                  <select value={aspect} disabled={running} onChange={(e) => setAspect(e.target.value as "9:16" | "16:9")} className={`${inputClass} mt-1`}>
                    <option value="9:16">Vertical (9:16)</option>
                    <option value="16:9">Horizontal (16:9)</option>
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
          {template.kind === "music" ? (
            <label className="block text-xs text-muted-foreground">
              Durée
              <select value={seconds} disabled={running} onChange={(e) => setSeconds(Number(e.target.value) as 15 | 30 | 60)} className={`${inputClass} mt-1`}>
                <option value={15}>15 secondes</option>
                <option value={30}>30 secondes</option>
                <option value={60}>60 secondes</option>
              </select>
            </label>
          ) : null}
        </div>
      </section>

      <GenerationStatus
        state={
          error
            ? { phase: "error", message: error }
            : label && startedAt !== null
              ? {
                  phase: "running",
                  label,
                  startedAt,
                  hint:
                    template.kind === "video"
                      ? "Comptez 1 à 3 minutes. Vous pouvez quitter la page : le suivi reprendra à votre retour."
                      : "Cela prend en général moins d'une minute.",
                }
              : { phase: "idle" }
        }
      />

      <ActionButton className="w-full gap-2" disabled={running || short} onClick={() => void handleCreate()}>
        {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {running ? "Création en cours…" : `Créer · ${costLabel(cost)}`}
      </ActionButton>
      <p className="flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-muted-foreground">
        <Coins className="size-3.5 text-gold" />
        {short
          ? `Crédits insuffisants : il vous en faut ${cost}, vous en avez ${balance}.`
          : `Débité au lancement${balance !== null ? ` · solde ${balance}` : ""} · remboursé si la création échoue.`}
      </p>
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clapperboard, Download, ImagePlus, Loader2, Send, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { useAuth } from "@/hooks/useAuth";
import { renderMusicClip, type ClipSource } from "@/lib/music-clip";
import { CLIP_MAX_MEDIA, CLIP_MAX_SECONDS, checkClipMedia } from "@/lib/music-clip-rules";
import { publishMusicClip } from "@/lib/publish-media";

/** Sélection des photos / vidéos du clip (dans l'ordre d'apparition). */
export function ClipMediaPicker({
  media,
  onChange,
  disabled,
  onError,
}: {
  media: ClipSource[];
  onChange: (next: ClipSource[]) => void;
  disabled?: boolean;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = media.map((m) => URL.createObjectURL(m.file));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [media]);

  function add(files: FileList | null) {
    if (!files) return;
    const next = [...media];
    for (const file of Array.from(files)) {
      if (next.length >= CLIP_MAX_MEDIA) {
        onError(`${CLIP_MAX_MEDIA} photos ou vidéos maximum.`);
        break;
      }
      const checked = checkClipMedia(file);
      if ("error" in checked) {
        onError(`${file.name} : ${checked.error}`);
        continue;
      }
      next.push({ file, kind: checked.kind });
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        className="hidden"
        aria-label="Ajouter des photos ou des vidéos au clip"
        onChange={(e) => {
          onError(null);
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-4 gap-2">
        {media.map((m, i) => (
          <div key={`${m.file.name}-${i}`} className="relative aspect-[9/16] overflow-hidden rounded-xl border border-border bg-surface">
            {m.kind === "image" ? (
              previews[i] ? <img src={previews[i]} alt={`Média ${i + 1}`} className="size-full object-cover" /> : null
            ) : previews[i] ? (
              <video src={previews[i]} muted playsInline className="size-full object-cover" />
            ) : null}
            {m.kind === "video" ? <Video className="absolute bottom-1 left-1 size-3.5 text-primary-foreground" /> : null}
            <span className="absolute top-1 left-1 rounded-full bg-background/80 px-1.5 text-[0.625rem] font-semibold text-foreground">{i + 1}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(media.filter((_, j) => j !== i))}
              aria-label={`Retirer le média ${i + 1}`}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/80 text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {media.length < CLIP_MAX_MEDIA ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface text-[0.6875rem] text-surface-foreground"
          >
            <ImagePlus className="size-5 text-accent" />
            Ajouter
          </button>
        ) : null}
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        Photos (JPEG, PNG, WebP) ou vidéos (MP4, WebM, MOV), {CLIP_MAX_MEDIA} maximum. Le montage se fait sur votre téléphone : rien n'est
        envoyé tant que vous ne publiez pas.
      </p>
    </div>
  );
}

type Render =
  | { step: "idle" }
  | { step: "rendering"; ratio: number; label: string }
  | { step: "done"; blob: Blob; url: string; mime: string; duration: number }
  | { step: "error"; message: string };

/** Montage et enregistrement du clip vertical synchronisé sur la musique, puis téléchargement / publication. */
export function ClipMaker({
  audioUrl,
  title,
  caption,
  media,
  onMediaChange,
  autoStart,
}: {
  audioUrl: string;
  title: string;
  caption: string;
  media: ClipSource[];
  onMediaChange: (next: ClipSource[]) => void;
  autoStart: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [render, setRender] = useState<Render>({ step: "idle" });
  const [pickError, setPickError] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState(title.slice(0, 100));
  const [publish, setPublish] = useState<{ state: "idle" | "busy" | "done"; postId?: string; error?: string }>({ state: "idle" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (render.step === "done") URL.revokeObjectURL(render.url);
    };
  }, [render]);

  async function start() {
    if (media.length === 0) return setPickError("Ajoutez au moins une photo ou une vidéo.");
    setPickError(null);
    setPublish({ state: "idle" });
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRender({ step: "rendering", ratio: 0, label: "Récupération de la musique…" });
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error("Musique introuvable. Recréez-la.");
      const audio = await response.blob();
      const result = await renderMusicClip({
        audio,
        media,
        title: postTitle,
        signal: ctrl.signal,
        onProgress: (ratio, label) => setRender({ step: "rendering", ratio, label }),
      });
      setRender({ step: "done", blob: result.blob, url: URL.createObjectURL(result.blob), mime: result.mime, duration: result.duration });
    } catch (e) {
      if (ctrl.signal.aborted) return setRender({ step: "idle" });
      setRender({ step: "error", message: e instanceof Error ? e.message : "Le montage a échoué." });
    }
  }

  // Lancement automatique au montage quand la musique vient d'être créée (le délai évite un double départ en mode développement).
  useEffect(() => {
    if (!autoStart || media.length === 0) return;
    const timer = setTimeout(() => void start(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  async function handlePublish() {
    if (!user || render.step !== "done") return;
    setPublish({ state: "busy" });
    try {
      const postId = await publishMusicClip({
        userId: user.id,
        blob: render.blob,
        mime: render.mime,
        title: postTitle,
        caption,
        duration: render.duration,
      });
      setPublish({ state: "done", postId });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e) {
      setPublish({ state: "idle", error: e instanceof Error ? e.message : "Publication impossible." });
    }
  }

  const rendering = render.step === "rendering";
  const ext = render.step === "done" && render.mime === "video/mp4" ? "mp4" : "webm";

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clapperboard className="size-4 text-accent" /> Clip vertical synchronisé
      </p>

      {render.step === "done" ? (
        <>
          <video src={render.url} controls playsInline className="mx-auto aspect-[9/16] max-h-[65vh] rounded-2xl border border-border bg-background" />
          <a href={render.url} download={`panu-clip.${ext}`} className="flex items-center justify-center gap-2 text-sm font-medium text-accent">
            <Download className="size-4" /> Télécharger le clip
          </a>
          {publish.state === "done" && publish.postId ? (
            <p className="flex items-center justify-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-accent" /> Clip publié !{" "}
              <Link to="/p/$postId" params={{ postId: publish.postId }} className="font-semibold text-accent underline">
                Voir la publication
              </Link>
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                value={postTitle}
                maxLength={100}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Titre du clip"
                aria-label="Titre du clip"
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
              <button
                type="button"
                disabled={publish.state === "busy"}
                onClick={() => void handlePublish()}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-music px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {publish.state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publier le clip
              </button>
            </div>
          )}
          {publish.error ? <p className="text-center text-xs text-destructive">{publish.error}</p> : null}
          <button type="button" onClick={() => setRender({ step: "idle" })} className="w-full text-center text-xs font-semibold text-muted-foreground underline">
            Changer les photos / vidéos et refaire le clip
          </button>
        </>
      ) : (
        <>
          <ClipMediaPicker media={media} onChange={onMediaChange} disabled={rendering} onError={setPickError} />
          {pickError ? <p className="text-xs text-destructive">{pickError}</p> : null}
          {rendering ? (
            <div className="space-y-1.5" role="status">
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-music transition-[width]" style={{ width: `${Math.round(render.ratio * 100)}%` }} />
              </div>
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>{render.label}</span>
                <span>{Math.round(render.ratio * 100)} %</span>
              </p>
              <p className="text-[0.6875rem] text-muted-foreground">
                L'enregistrement dure le temps du morceau ({CLIP_MAX_SECONDS} s maximum). Gardez cette page ouverte et l'écran allumé.
              </p>
              <button type="button" onClick={() => abort.current?.abort()} className="text-xs font-semibold text-destructive underline">
                Annuler le montage
              </button>
            </div>
          ) : (
            <ActionButton className="w-full gap-2" disabled={media.length === 0} onClick={() => void start()}>
              <Clapperboard className="size-4" /> Créer le clip vertical · gratuit
            </ActionButton>
          )}
          {render.step === "error" ? <p role="alert" className="text-xs text-destructive">{render.message}</p> : null}
        </>
      )}
    </section>
  );
}

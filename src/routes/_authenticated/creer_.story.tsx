import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clapperboard, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/creer_/story")({
  head: () => ({
    meta: [
      { title: "Nouvelle story — PANU" },
      {
        name: "description",
        content: "Publiez une story photo ou vidéo visible 24 heures par vos abonnés sur PANU.",
      },
      { property: "og:title", content: "Nouvelle story — PANU" },
    ],
  }),
  component: CreerStoryPage,
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function CreerStoryPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overlay, setOverlay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaKind: "image" | "video" = file?.type.startsWith("video/") ? "video" : "image";

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const isImage = selected.type.startsWith("image/");
    const isVideo = selected.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Choisissez une photo ou une vidéo.");
      return;
    }
    if (isImage && selected.size > MAX_IMAGE_BYTES) {
      setError("La photo dépasse 10 Mo.");
      return;
    }
    if (isVideo && selected.size > MAX_VIDEO_BYTES) {
      setError("La vidéo dépasse 50 Mo.");
      return;
    }
    setFile(selected);
  }

  const publish = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choisissez un fichier.");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Session expirée : reconnectez-vous.");
      const extension = (file.name.split(".").pop() ?? "bin")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${user.id}/stories/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(path, file, {
        contentType: file.type || undefined,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(`Envoi impossible : ${uploadError.message}`);
      const { error: insertError } = await supabase.from("stories").insert({
        author_id: user.id,
        media_path: path,
        media_type: mediaKind,
        overlay_text: overlay.trim() ? overlay.trim() : null,
      });
      if (insertError) {
        await supabase.storage.from("videos").remove([path]);
        throw new Error("Publication impossible. Réessayez.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await navigate({ to: "/" });
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  if (!session) {
    return (
      <AppShell title="Nouvelle story" subtitle="Connectez-vous pour publier">
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Vous devez être connecté pour publier une story.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Nouvelle story" subtitle="Visible 24 heures par vos abonnés">
      <div className="space-y-4 px-4 py-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0] ?? null)}
        />

        <div className="relative aspect-[9/16] max-h-[60vh] w-full overflow-hidden rounded-3xl border border-border bg-card">
          {file && previewUrl ? (
            mediaKind === "video" ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="absolute inset-0 size-full bg-background object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Aperçu de la story"
                className="absolute inset-0 size-full bg-background object-contain"
              />
            )
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-electric text-electric-foreground">
                <ImagePlus className="size-6" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold text-foreground">
                Choisir une photo ou une vidéo
              </span>
              <span className="text-xs text-muted-foreground">Photo ≤ 10 Mo · Vidéo ≤ 50 Mo</span>
            </button>
          )}
          {file ? (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Retirer le média"
              className="absolute top-3 right-3flex size-9 items-center justify-center rounded-full bg-background/70 text-foreground"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          ) : null}
          {overlay.trim() ? (
            <span className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
              <span className="rounded-xl bg-background/70 px-3 py-1.5 text-center font-display text-base font-semibold text-foreground shadow-lg">
                {overlay}
              </span>
            </span>
          ) : null}
        </div>

        <div>
          <label htmlFor="story-overlay" className="text-xs font-semibold text-muted-foreground">
            Texte superposé (facultatif)
          </label>
          <input
            id="story-overlay"
            value={overlay}
            onChange={(event) => setOverlay(event.target.value.slice(0, 120))}
            placeholder="Une phrase courte…"
            maxLength={120}
            className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-right text-[0.6875rem] text-muted-foreground">
            {overlay.length}/120
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="button"
          onClick={() => publish.mutate()}
          disabled={!file || publish.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-electric text-sm font-bold text-electric-foreground disabled:opacity-50"
        >
          {publish.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" strokeWidth={2} />
          )}
          Publier la story
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Clapperboard className="size-3.5" strokeWidth={1.75} />
          Votre story expire automatiquement après 24 heures.
        </p>
      </div>
    </AppShell>
  );
}

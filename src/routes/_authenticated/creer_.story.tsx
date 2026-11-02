import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { mediaStoragePath, STORY_TEXT_MAX, validateStoryFile } from "@/lib/media-rules";

export const Route = createFileRoute("/_authenticated/creer_/story")({
  head: () => ({
    meta: [
      { title: "Nouvelle story — PANU" },
      { name: "description", content: "Publiez une photo ou une vidéo visible 24 heures par vos abonnés." },
      { property: "og:title", content: "Nouvelle story — PANU" },
      { property: "og:description", content: "Une story visible 24 heures." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StoryPage,
});

function StoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"image" | "video" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    const check = validateStoryFile(selected);
    if (check.error) {
      setError(check.error);
      return;
    }
    setError(null);
    setFile(selected);
    setType(check.type);
  }

  async function handlePublish() {
    if (!user || !file || !type) return;
    setSending(true);
    setError(null);
    const path = mediaStoragePath(user.id, "stories", file.type, Date.now());
    const upload = await supabase.storage.from("videos").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) {
      setSending(false);
      setError("L'envoi a échoué. Réessayez.");
      return;
    }
    const { error: insertError } = await supabase.from("stories").insert({
      author_id: user.id,
      media_path: path,
      media_type: type,
      overlay_text: text.trim() || null,
    });
    if (insertError) {
      await supabase.storage.from("videos").remove([path]);
      setSending(false);
      setError("La story n'a pas pu être publiée. Réessayez.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["stories"] });
    void navigate({ to: "/" });
  }

  return (
    <AppShell
      title="Nouvelle story"
      subtitle="Visible 24 h"
      headerAction={
        <Link
          to="/"
          aria-label="Retour"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <div className="space-y-4 px-4 py-5">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative flex aspect-[9/16] max-h-[60dvh] w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-border bg-surface-gradient"
        >
          {preview && type === "image" ? (
            <img src={preview} alt="Aperçu de la story" className="absolute inset-0 size-full object-cover" />
          ) : preview && type === "video" ? (
            <video src={preview} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="size-8" /> Choisir une photo ou une vidéo
            </span>
          )}
          {preview && text.trim() ? (
            <span className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-background/60 px-4 py-3 text-center text-lg font-bold break-words text-foreground">
              {text}
            </span>
          ) : null}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFile}
        />
        <label className="block text-xs text-muted-foreground">
          Texte sur la story (facultatif)
          <input
            value={text}
            maxLength={STORY_TEXT_MAX}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ActionButton className="w-full gap-2" disabled={!file || sending} onClick={() => void handlePublish()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : null}
          {sending ? "Publication…" : "Publier la story"}
        </ActionButton>
      </div>
    </AppShell>
  );
}

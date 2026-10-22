import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { ActionButton } from "@/components/common/ActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileAvatar, useAvatarUrl } from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AVATAR_MIME_TYPES,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  avatarStoragePath,
  validateAvatarFile,
  validateProfileFields,
} from "@/lib/profile-rules";

export const Route = createFileRoute("/_authenticated/profil_/modifier")({
  head: () => ({
    meta: [
      { title: "Modifier le profil — PANU" },
      {
        name: "description",
        content: "Modifiez votre photo, votre nom affiché et votre biographie sur PANU.",
      },
      { property: "og:title", content: "Modifier le profil — PANU" },
      { property: "og:description", content: "Photo, nom affiché et biographie de votre profil." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: currentAvatar } = useAvatarUrl(profile?.avatar_url);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    const problem = validateAvatarFile(selected);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    const problem = validateProfileFields({ displayName, bio });
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let avatarPath = profile.avatar_url;
      if (file) {
        const path = avatarStoragePath(user.id, file.type, Date.now());
        const upload = await supabase.storage
          .from("avatars")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw new Error("L'envoi de la photo a échoué. Réessayez.");
        // L'ancienne photo est supprimée une fois la nouvelle en place.
        if (avatarPath && !avatarPath.startsWith("http")) {
          await supabase.storage.from("avatars").remove([avatarPath]);
        }
        avatarPath = path;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() ? bio.trim() : null,
          avatar_url: avatarPath,
        })
        .eq("id", user.id);
      if (updateError) throw new Error("L'enregistrement a échoué. Réessayez.");

      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["public-profile", profile.username] });
      await queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
      void navigate({ to: "/@{$username}", params: { username: profile.username } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Modifier le profil"
      headerAction={
        <Link
          to="/profil"
          aria-label="Retour au profil"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      {loading || !profile ? (
        <div className="px-4 py-6">
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 px-4 py-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Changer la photo de profil"
            >
              <ProfileAvatar url={preview ?? currentAvatar} alt="Votre photo de profil" size="xl" />
              <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow">
                <Camera className="size-4" strokeWidth={2} />
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={AVATAR_MIME_TYPES.join(",")}
              onChange={handleFile}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — 5 Mo maximum</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Nom d'utilisateur
            </label>
            <input
              id="username"
              value={`@${profile.username}`}
              disabled
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              Nom affiché
            </label>
            <input
              id="displayName"
              value={displayName}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Biographie
              </label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="bio"
              value={bio}
              rows={4}
              maxLength={BIO_MAX_LENGTH}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Présentez-vous en quelques mots"
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <ActionButton type="submit" disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        </form>
      )}
    </AppShell>
  );
}

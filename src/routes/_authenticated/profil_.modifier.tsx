import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, ImagePlus, Loader2 } from "lucide-react";
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
  USERNAME_MAX_LENGTH,
  avatarStoragePath,
  coverStoragePath,
  validateAvatarFile,
  validateProfileFields,
  validateUsername,
} from "@/lib/profile-rules";
import { normalizeWebsite } from "@/lib/prefs";
import { isUsernameAvailable, normalizeUsername } from "@/lib/profiles";
import { cleanSocialLinks, SOCIAL_NETWORKS } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/profil_/modifier")({
  head: () => ({
    meta: [
      { title: "Modifier le profil — PANU" },
      {
        name: "description",
        content: "Modifiez votre photo, votre couverture, votre nom et votre biographie sur PANU.",
      },
      { property: "og:title", content: "Modifier le profil — PANU" },
      { property: "og:description", content: "Photo, couverture, nom et biographie de votre profil." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfilePage,
});

/** Aperçu local d'un fichier choisi, libéré automatiquement. */
function useFilePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview;
}

async function uploadImage(path: string, file: File, previous: string | null) {
  const upload = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw new Error("L'envoi de la photo a échoué. Réessayez.");
  // L'ancienne photo est supprimée une fois la nouvelle en place.
  if (previous && !previous.startsWith("http")) {
    await supabase.storage.from("avatars").remove([previous]);
  }
  return path;
}

function EditProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [social, setSocial] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarPreview = useFilePreview(avatarFile);
  const coverPreview = useFilePreview(coverFile);
  const { data: currentAvatar } = useAvatarUrl(profile?.avatar_url);
  const { data: currentCover } = useAvatarUrl(profile?.cover_url);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setCity(profile.city ?? "");
      setCountry(profile.country ?? "");
      setWebsite(profile.website ?? "");
      setSocial(profile.social_links);
    }
  }, [profile]);

  function pick(setter: (f: File) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      event.target.value = "";
      if (!selected) return;
      const problem = validateAvatarFile(selected);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      setter(selected);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    const nextUsername = normalizeUsername(username);
    const problem = validateUsername(nextUsername) ?? validateProfileFields({ displayName, bio });
    if (problem) {
      setError(problem);
      return;
    }

    const nextWebsite = website.trim() ? normalizeWebsite(website) : null;
    if (website.trim() && !nextWebsite) {
      setError("Le site web n'est pas une adresse valide.");
      return;
    }
    const rawSocial = Object.fromEntries(Object.entries(social).filter(([, v]) => v.trim()));
    const nextSocial = cleanSocialLinks(rawSocial);
    if (Object.keys(nextSocial).length !== Object.keys(rawSocial).length) {
      setError("Un des liens de réseau social n'est pas une adresse valide.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const usernameChanged = nextUsername !== profile.username;
      if (usernameChanged && !(await isUsernameAvailable(nextUsername))) {
        throw new Error("Ce nom d'utilisateur est déjà pris.");
      }

      const now = Date.now();
      const avatarPath = avatarFile
        ? await uploadImage(avatarStoragePath(user.id, avatarFile.type, now), avatarFile, profile.avatar_url)
        : profile.avatar_url;
      const coverPath = coverFile
        ? await uploadImage(coverStoragePath(user.id, coverFile.type, now), coverFile, profile.cover_url)
        : profile.cover_url;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: nextUsername,
          display_name: displayName.trim(),
          bio: bio.trim() ? bio.trim() : null,
          location: location.trim() ? location.trim().slice(0, 60) : null,
          city: city.trim() ? city.trim().slice(0, 60) : null,
          country: country.trim() ? country.trim().slice(0, 60) : null,
          website: nextWebsite,
          social_links: nextSocial,
          avatar_url: avatarPath,
          cover_url: coverPath,
        })
        .eq("id", user.id);
      if (updateError) {
        throw new Error(
          updateError.code === "23505"
            ? "Ce nom d'utilisateur est déjà pris."
            : "L'enregistrement a échoué. Réessayez.",
        );
      }

      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      void navigate({ to: "/@{$username}", params: { username: nextUsername } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
  const coverSrc = coverPreview ?? currentCover;

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
        <form onSubmit={handleSubmit} className="space-y-6 pb-6">
          <div>
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              aria-label="Changer la photo de couverture"
              className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-surface-gradient focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {coverSrc ? (
                <img src={coverSrc} alt="Votre photo de couverture" className="absolute inset-0 size-full object-cover" />
              ) : null}
              <span className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur-sm">
                <ImagePlus className="size-4" strokeWidth={2} />
                {coverSrc ? "Changer la couverture" : "Ajouter une couverture"}
              </span>
            </button>
            <input
              ref={coverInput}
              type="file"
              accept={AVATAR_MIME_TYPES.join(",")}
              onChange={pick(setCoverFile)}
              className="hidden"
            />

            <div className="-mt-12 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label="Changer la photo de profil"
              >
                <ProfileAvatar url={avatarPreview ?? currentAvatar} alt="Votre photo de profil" size="xl" />
                <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow">
                  <Camera className="size-4" strokeWidth={2} />
                </span>
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept={AVATAR_MIME_TYPES.join(",")}
                onChange={pick(setAvatarFile)}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — 5 Mo maximum</p>
            </div>
          </div>

          <div className="space-y-6 px-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <input
                  id="username"
                  value={username}
                  maxLength={USERNAME_MAX_LENGTH}
                  autoComplete="username"
                  autoCapitalize="none"
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  className={`${fieldClass} pl-7`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lettres minuscules, chiffres, « . » ou « _ ». Votre lien de profil changera.
              </p>
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
                className={fieldClass}
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

            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium text-foreground">
                Localisation
              </label>
              <input
                id="location"
                value={location}
                maxLength={60}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex. : Kinshasa, RDC"
                className={fieldClass}
              />
              <p className="text-xs text-muted-foreground">Facultatif — affichée sur vos publications.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium text-foreground">
                  Ville
                </label>
                <input id="city" value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} placeholder="Kinshasa" className={fieldClass} />
              </div>
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium text-foreground">
                  Pays
                </label>
                <input id="country" value={country} maxLength={60} onChange={(e) => setCountry(e.target.value)} placeholder="RDC" className={fieldClass} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="website" className="text-sm font-medium text-foreground">
                Site web
              </label>
              <input id="website" value={website} maxLength={200} inputMode="url" autoCapitalize="none" onChange={(e) => setWebsite(e.target.value)} placeholder="https://monsite.com" className={fieldClass} />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Réseaux sociaux (facultatif)</legend>
              {SOCIAL_NETWORKS.map((n) => (
                <input
                  key={n.key}
                  aria-label={n.label}
                  value={social[n.key] ?? ""}
                  maxLength={200}
                  inputMode="url"
                  autoCapitalize="none"
                  onChange={(e) => setSocial((current) => ({ ...current, [n.key]: e.target.value }))}
                  placeholder={`${n.label} — ${n.placeholder}`}
                  className={fieldClass}
                />
              ))}
              <p className="text-xs text-muted-foreground">
                Choisissez ce qui est visible publiquement dans Paramètres → Informations du profil.
              </p>
            </fieldset>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <ActionButton type="submit" disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </ActionButton>
          </div>
        </form>
      )}
    </AppShell>
  );
}

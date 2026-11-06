/** Règles du profil PANU, sans dépendance au navigateur ni au serveur. */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const BIO_MAX_LENGTH = 300;
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** Seul le propriétaire connecté peut modifier un profil. */
export function canEditProfile(
  viewerId: string | null | undefined,
  profileId: string,
): boolean {
  return Boolean(viewerId) && viewerId === profileId;
}

/** Retourne un message d'erreur, ou null si le fichier est accepté. */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Format non pris en charge. Utilisez une image JPG, PNG ou WebP.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Image trop lourde : 5 Mo maximum.";
  }
  return null;
}

export function validateProfileFields(fields: {
  displayName: string;
  bio: string;
}): string | null {
  const name = fields.displayName.trim();
  if (name.length === 0) return "Le nom affiché est obligatoire.";
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Le nom affiché ne doit pas dépasser ${DISPLAY_NAME_MAX_LENGTH} caractères.`;
  }
  if (fields.bio.trim().length > BIO_MAX_LENGTH) {
    return `La biographie ne doit pas dépasser ${BIO_MAX_LENGTH} caractères.`;
  }
  return null;
}

/** Chemin de stockage : un dossier par utilisateur (exigé par les règles d'accès). */
export function avatarStoragePath(userId: string, mimeType: string, timestamp: number): string {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${userId}/avatar-${timestamp}.${ext}`;
}

/** Photo de couverture : même dossier utilisateur que l'avatar. */
export function coverStoragePath(userId: string, mimeType: string, timestamp: number): string {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${userId}/cover-${timestamp}.${ext}`;
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-z0-9_.]+$/;

/** Nom d'utilisateur : 3 à 30 caractères, minuscules, chiffres, « . » ou « _ ». */
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Le nom d'utilisateur doit contenir entre ${USERNAME_MIN_LENGTH} et ${USERNAME_MAX_LENGTH} caractères.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Le nom d'utilisateur ne peut contenir que des lettres minuscules, des chiffres, « . » ou « _ ».";
  }
  return null;
}

/** Un utilisateur connecté peut suivre n'importe quel profil, sauf le sien. */
export function canFollow(viewerId: string | null | undefined, profileId: string): boolean {
  return Boolean(viewerId) && viewerId !== profileId;
}

/** Nouveau nombre d'abonnés après un clic sur Suivre / Ne plus suivre (jamais négatif). */
export function nextFollowerCount(current: number, wasFollowing: boolean): number {
  return wasFollowing ? Math.max(0, current - 1) : current + 1;
}

export type ProfileTab = "publications" | "videos" | "reels" | "photos" | "stories" | "enregistres";

/** Un Reel est une vidéo courte (90 secondes ou moins). */
export const REEL_MAX_SECONDS = 90;

/** Onglets du profil : « Enregistrés » est privé, visible uniquement par le propriétaire. */
export function profileTabsFor(isOwner: boolean): ProfileTab[] {
  const tabs: ProfileTab[] = ["publications", "videos", "reels", "photos", "stories"];
  return isOwner ? [...tabs, "enregistres"] : tabs;
}

/** Publications affichées dans un onglet (Vidéos = vidéos, Photos = images, Publications = tout). */
export function postsForTab<T extends { kind: string; mediaDuration?: number | null }>(
  tab: ProfileTab,
  posts: T[],
): T[] {
  if (tab === "videos") return posts.filter((p) => p.kind === "video");
  if (tab === "reels") {
    return posts.filter(
      (p) => p.kind === "video" && typeof p.mediaDuration === "number" && p.mediaDuration <= REEL_MAX_SECONDS,
    );
  }
  if (tab === "photos") return posts.filter((p) => p.kind === "image");
  return posts;
}

/** Libellé affiché sous un profil suggéré (selon la raison renvoyée par la base). */
export function suggestionLabel(reason: string, mutualCount: number): string {
  switch (reason) {
    case "vous_suit":
      return "Vous suit";
    case "amis_communs":
      return mutualCount > 0 ? `${mutualCount} en commun` : "Amis en commun";
    case "actif":
      return "Créateur actif";
    case "nouveau":
      return "Nouveau membre";
    default:
      return "Suggestion";
  }
}

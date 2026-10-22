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

export const MIN_PASSWORD_LENGTH = 8;
export const DELETE_CONFIRMATION_WORD = "SUPPRIMER";

/** Renvoie un message d'erreur si le nouveau mot de passe est refusé, sinon null. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (password !== confirmation) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}

/** La suppression du compte n'est autorisée qu'après avoir tapé le mot de confirmation. */
export function canDeleteAccount(typed: string): boolean {
  return typed.trim() === DELETE_CONFIRMATION_WORD;
}

/** Règles de l'espace d'administration (sans dépendance navigateur/serveur). */

export type StaffRole = "founder" | "admin";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam ou arnaque" },
  { value: "harcelement", label: "Harcèlement ou haine" },
  { value: "contenu_sexuel", label: "Contenu sexuel" },
  { value: "violence", label: "Violence" },
  { value: "desinformation", label: "Désinformation" },
  { value: "autre", label: "Autre" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_DETAILS_MAX = 500;

export function reasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

export function parseStaffRole(value: unknown): StaffRole | null {
  return value === "founder" || value === "admin" ? value : null;
}

/** Ce que chaque rôle peut ouvrir dans l'espace d'administration. */
export type AdminTab = "apercu" | "utilisateurs" | "signalements" | "administrateurs" | "abonnements" | "journal" | "monetisation" | "modeles" | "partage";

const TABS_BY_ROLE: Record<StaffRole, AdminTab[]> = {
  admin: ["apercu", "utilisateurs", "signalements", "modeles", "partage"],
  founder: ["apercu", "utilisateurs", "signalements", "modeles", "partage", "administrateurs", "abonnements", "journal", "monetisation"],
};

export function tabsForRole(role: StaffRole): AdminTab[] {
  return TABS_BY_ROLE[role];
}

export function canManageAdmins(role: StaffRole | null): boolean {
  return role === "founder";
}

export const AUDIT_LABELS: Record<string, string> = {
  admin_granted: "Rôle administrateur accordé",
  admin_revoked: "Rôle administrateur retiré",
  plan_changed: "Offre modifiée",
  post_removed: "Publication supprimée",
  report_resolved: "Signalement traité",
  report_dismissed: "Signalement rejeté",
  template_saved: "Modèle IA enregistré",
  share_settings_updated: "Paramètres de partage modifiés",
  template_published: "Modèle IA publié",
  template_unpublished: "Modèle IA désactivé",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}

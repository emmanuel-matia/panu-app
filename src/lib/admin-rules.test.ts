import { describe, expect, it } from "vitest";

import { auditLabel, canManageAdmins, parseStaffRole, tabsForRole } from "./admin-rules";

describe("rôles de l'espace d'administration", () => {
  it("seul le fondateur gère les administrateurs", () => {
    expect(canManageAdmins("founder")).toBe(true);
    expect(canManageAdmins("admin")).toBe(false);
    expect(canManageAdmins(null)).toBe(false);
  });

  it("l'administrateur a l'aperçu, les utilisateurs, les signalements et les modèles IA", () => {
    expect(tabsForRole("admin")).toEqual(["apercu", "utilisateurs", "signalements", "modeles", "partage"]);
  });

  it("le fondateur voit aussi administrateurs, abonnements, journal et monétisation", () => {
    expect(tabsForRole("founder")).toEqual(
      expect.arrayContaining(["administrateurs", "abonnements", "journal", "monetisation"]),
    );
  });

  it("un rôle inconnu n'ouvre rien", () => {
    expect(parseStaffRole("user")).toBeNull();
    expect(parseStaffRole(null)).toBeNull();
    expect(parseStaffRole("admin")).toBe("admin");
  });

  it("nomme les actions du journal", () => {
    expect(auditLabel("post_removed")).toBe("Publication supprimée");
  });
});

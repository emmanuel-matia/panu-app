import { describe, expect, it } from "vitest";

import { LEGAL_DOCUMENTS, LEGAL_PUBLISHER, legalDocument } from "./legal-documents";

describe("documents juridiques officiels", () => {
  it("identifie l'éditeur ETS GREEN MATIA avec son RCCM", () => {
    expect(LEGAL_PUBLISHER.name).toBe("ETS GREEN MATIA");
    expect(LEGAL_PUBLISHER.rccm).toBe("CD/MJM/RCCM/25-A-01657");
    expect(LEGAL_PUBLISHER.email).toBe("matia@gmail.com");
  });

  it("publie les six documents, chacun sur sa propre page", () => {
    expect(LEGAL_DOCUMENTS).toHaveLength(6);
    expect(new Set(LEGAL_DOCUMENTS.map((d) => d.path)).size).toBe(6);
  });

  it("reprend le nombre d'articles transmis", () => {
    expect(legalDocument("cgu").articles).toHaveLength(10);
    expect(legalDocument("confidentialite").articles).toHaveLength(10);
    expect(legalDocument("cookies").articles).toHaveLength(6);
    expect(legalDocument("communaute").articles).toHaveLength(9);
    expect(legalDocument("abonnements").articles).toHaveLength(10);
  });

  it("signale que la politique IA reçue est incomplète", () => {
    expect(legalDocument("ia").incomplete).toBe(true);
  });
});

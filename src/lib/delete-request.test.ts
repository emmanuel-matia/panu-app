import { describe, it, expect } from "vitest";
import { legalDocument } from "./legal-documents";
describe("privacy policy deletion link", () => {
  it("points to the public deletion page", () => {
    expect(JSON.stringify(legalDocument("confidentialite"))).toContain("https://panu.site/suppression-compte");
  });
});

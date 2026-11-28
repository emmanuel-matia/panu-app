import { describe, expect, it } from "vitest";
import { ownedDrafts, type CreationDraft } from "./create-drafts";
import { audioSelection } from "./create-audio-rules";
describe("Brouillons personnels", () => {
  it("isole les brouillons par compte", () => {
    const row: CreationDraft = { id: "1", userId: "emmanuel", kind: "texte", title: "test", text: "test", files: [], updatedAt: 1 };
    expect(ownedDrafts([row, { ...row, id: "2", userId: "other" }], "emmanuel").map((draft) => draft.id)).toEqual(["1"]);
  });
});
describe("Passage audio personnel", () => {
  it("conserve le passage, le décalage et le volume sélectionnés", () => {
    expect(audioSelection(120, 20, 35, 4, 0.4)).toEqual({ start: 20, end: 35, at: 4, volume: 0.4 });
  });
  it("borne le passage à la durée réelle", () => { expect(audioSelection(10, 2, 50, -1, 2)).toEqual({ start: 2, end: 10, at: 0, volume: 1 }); });
});
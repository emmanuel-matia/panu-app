import { describe, expect, it } from "vitest";
import {
  captionWithHashtags, clampClipTrim, clipLength, locate, moveClip, newClip, normalizeHashtags,
  pickRecorderMime, splitAt, totalLength, aspectSize, overlayAlpha,
} from "./editor-rules";

const a = newClip("a", "blob:a", "a.mp4", 10);
const b = { ...newClip("b", "blob:b", "b.mp4", 4), speed: 2 };

describe("montage vidéo", () => {
  it("le ralenti et l'accélération changent la durée sur la timeline", () => {
    expect(clipLength({ start: 0, end: 4, speed: 2 })).toBe(2);
    expect(clipLength({ start: 0, end: 4, speed: 0.5 })).toBe(8);
    expect(totalLength([a, b])).toBe(12);
  });
  it("trouve le clip actif à un instant", () => {
    expect(locate([a, b], 11)).toEqual({ index: 1, offset: 10, local: 1 });
  });
  it("divise un clip en deux au curseur", () => {
    const r = splitAt([a, b], 4, "c");
    expect(r.map((c) => [c.id, c.start, c.end])).toEqual([["a", 0, 4], ["c", 4, 10], ["b", 0, 4]]);
    expect(totalLength(r)).toBe(12);
  });
  it("refuse une coupe collée au bord", () => {
    expect(splitAt([a], 0.1, "c")).toHaveLength(1);
  });
  it("réorganise les clips", () => {
    expect(moveClip(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveClip(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
  it("garde au moins 0,3 s par clip", () => {
    expect(clampClipTrim(9.9, 9.95, 10)).toEqual({ start: 9.7, end: 10 });
  });
  it("le texte animé apparaît progressivement", () => {
    expect(overlayAlpha(1.2, 1, 5, true)).toBeCloseTo(0.5);
    expect(overlayAlpha(6, 1, 5, false)).toBe(0);
  });
  it("préfère un export MP4 quand le téléphone le permet", () => {
    expect(pickRecorderMime((m) => m.startsWith("video/webm"))).toBe("video/webm;codecs=vp9,opus");
    expect(pickRecorderMime((m) => m === "video/mp4")).toBe("video/mp4");
  });
});

describe("publication", () => {
  it("normalise les hashtags sans doublon", () => {
    expect(normalizeHashtags("afrique, #RDC  musique #RDC")).toBe("#afrique #RDC #musique");
    expect(captionWithHashtags("Ma vidéo", "kin")).toBe("Ma vidéo\n\n#kin");
  });
});

describe("photo", () => {
  it("recadre au format choisi", () => {
    expect(aspectSize("9:16", 4000, 3000, 1920)).toEqual({ w: 1080, h: 1920 });
    expect(aspectSize("original", 4000, 3000, 2000)).toEqual({ w: 2000, h: 1500 });
  });
});

import { describe, expect, it } from "vitest";

import {
  clampTrim,
  validateAiPrompt,
  validateVideoFile,
  validateVideoPostFields,
  videoStoragePath,
} from "./video-rules";

const MB = 1024 * 1024;

describe("validateVideoFile", () => {
  it("accepte une vidéo MP4 de 50 Mo", () => {
    expect(validateVideoFile({ type: "video/mp4", size: 50 * MB })).toBeNull();
  });
  it("refuse une vidéo de plus de 50 Mo", () => {
    expect(validateVideoFile({ type: "video/mp4", size: 50 * MB + 1 })).toMatch(/50 Mo/);
  });
  it("refuse une image", () => {
    expect(validateVideoFile({ type: "image/png", size: MB })).toMatch(/Format/);
  });
  it("accepte un .mov sans type MIME (certains téléphones)", () => {
    expect(validateVideoFile({ type: "", size: MB, name: "clip.MOV" })).toBeNull();
  });
});

describe("validateVideoPostFields", () => {
  it("exige un titre", () => {
    expect(validateVideoPostFields({ title: "  ", caption: "", overlayText: "" })).toMatch(
      /titre/,
    );
  });
  it("refuse un titre de 101 caractères", () => {
    expect(
      validateVideoPostFields({ title: "a".repeat(101), caption: "", overlayText: "" }),
    ).toMatch(/100/);
  });
  it("refuse une légende de 501 caractères", () => {
    expect(
      validateVideoPostFields({ title: "Ok", caption: "a".repeat(501), overlayText: "" }),
    ).toMatch(/500/);
  });
});

describe("clampTrim", () => {
  it("garde au moins 1 seconde de vidéo", () => {
    expect(clampTrim(9.5, 9.6, 10)).toEqual({ start: 8.6, end: 9.6 });
  });
  it("ne dépasse jamais la durée", () => {
    expect(clampTrim(-2, 15, 10)).toEqual({ start: 0, end: 10 });
  });
});

describe("videoStoragePath", () => {
  it("range la vidéo dans le dossier de l'utilisateur", () => {
    expect(videoStoragePath("u1", "video/quicktime", 42)).toBe("u1/video-42.mov");
  });
});

describe("validateAiPrompt", () => {
  it("refuse une description trop courte", () => {
    expect(validateAiPrompt("court")).toMatch(/10/);
  });
  it("accepte une description de 10 caractères", () => {
    expect(validateAiPrompt("a".repeat(10))).toBeNull();
  });
});

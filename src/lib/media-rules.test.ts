import { describe, expect, it } from "vitest";

import {
  canRemix,
  isStoryActive,
  mediaStoragePath,
  postShareUrl,
  validateAudioFile,
  validateComment,
  validateImageFile,
  validateStoryFile,
} from "./media-rules";

const MB = 1024 * 1024;

describe("images", () => {
  it("accepte un JPG de 15 Mo", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 15 * MB })).toBeNull();
  });
  it("refuse une image de plus de 15 Mo", () => {
    expect(validateImageFile({ type: "image/png", size: 15 * MB + 1 })).not.toBeNull();
  });
  it("refuse un PDF", () => {
    expect(validateImageFile({ type: "application/pdf", size: MB })).not.toBeNull();
  });
});

describe("audio", () => {
  it("accepte un MP3 sans type MIME grâce à l'extension", () => {
    expect(validateAudioFile({ type: "", size: MB, name: "chanson.mp3" })).toBeNull();
  });
  it("refuse un audio de plus de 50 Mo", () => {
    expect(validateAudioFile({ type: "audio/mpeg", size: 50 * MB + 1 })).not.toBeNull();
  });
});

describe("stories", () => {
  it("accepte une vidéo MP4 de 30 Mo", () => {
    expect(validateStoryFile({ type: "video/mp4", size: 30 * MB })).toEqual({ error: null, type: "video" });
  });
  it("refuse une story de plus de 30 Mo", () => {
    expect(validateStoryFile({ type: "image/jpeg", size: 30 * MB + 1 }).error).not.toBeNull();
  });
  it("est visible 23 h 59 après publication", () => {
    const created = new Date("2026-10-26T10:00:00Z");
    expect(isStoryActive(created, new Date("2026-10-27T09:59:00Z"))).toBe(true);
  });
  it("expire 24 h après publication", () => {
    const created = new Date("2026-10-26T10:00:00Z");
    expect(isStoryActive(created, new Date("2026-10-27T10:00:00Z"))).toBe(false);
  });
});

describe("commentaires", () => {
  it("refuse un commentaire vide", () => {
    expect(validateComment("   ")).not.toBeNull();
  });
  it("refuse plus de 1000 caractères", () => {
    expect(validateComment("a".repeat(1001))).not.toBeNull();
  });
  it("accepte 1000 caractères", () => {
    expect(validateComment("a".repeat(1000))).toBeNull();
  });
});

describe("chemins, partage, remix", () => {
  it("range le fichier dans le dossier de l'utilisateur", () => {
    expect(mediaStoragePath("u1", "audio", "audio/mpeg", 42)).toBe("u1/audio/42.mp3");
  });
  it("le lien de partage pointe vers la publication exacte", () => {
    expect(postShareUrl("https://panu-app.lovable.app/", "abc")).toBe("https://panu-app.lovable.app/p/abc");
  });
  it("refuse le remix quand le créateur l'a désactivé", () => {
    expect(canRemix({ allowRemix: false })).toBe(false);
  });
});

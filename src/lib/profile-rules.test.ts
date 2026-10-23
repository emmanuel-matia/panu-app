import { describe, expect, it } from "vitest";

import {
  avatarStoragePath,
  canEditProfile,
  canFollow,
  nextFollowerCount,
  validateAvatarFile,
  validateProfileFields,
} from "./profile-rules";

describe("canEditProfile", () => {
  it("autorise le propriétaire connecté", () => {
    expect(canEditProfile("u1", "u1")).toBe(true);
  });
  it("refuse un autre utilisateur connecté", () => {
    expect(canEditProfile("u2", "u1")).toBe(false);
  });
  it("refuse un visiteur non connecté", () => {
    expect(canEditProfile(null, "u1")).toBe(false);
  });
});

describe("validateAvatarFile", () => {
  it("accepte une image PNG de 5 Mo", () => {
    expect(validateAvatarFile({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
  });
  it("refuse une image de plus de 5 Mo", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("refuse un fichier qui n'est pas une image", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 1000 })).not.toBeNull();
  });
});

describe("validateProfileFields", () => {
  it("refuse une biographie de plus de 300 caractères", () => {
    expect(validateProfileFields({ displayName: "Ama", bio: "a".repeat(301) })).not.toBeNull();
  });
  it("accepte une biographie de 300 caractères", () => {
    expect(validateProfileFields({ displayName: "Ama", bio: "a".repeat(300) })).toBeNull();
  });
  it("refuse un nom affiché vide", () => {
    expect(validateProfileFields({ displayName: "  ", bio: "" })).not.toBeNull();
  });
});

describe("avatarStoragePath", () => {
  it("range l'avatar dans le dossier de l'utilisateur", () => {
    expect(avatarStoragePath("u1", "image/webp", 42)).toBe("u1/avatar-42.webp");
  });
});

describe("canFollow", () => {
  it("autorise un utilisateur connecté à suivre un autre profil", () => {
    expect(canFollow("u2", "u1")).toBe(true);
  });
  it("interdit de se suivre soi-même", () => {
    expect(canFollow("u1", "u1")).toBe(false);
  });
  it("interdit à un visiteur non connecté de suivre", () => {
    expect(canFollow(null, "u1")).toBe(false);
  });
});

describe("nextFollowerCount", () => {
  it("ajoute un abonné quand on suit", () => {
    expect(nextFollowerCount(3, false)).toBe(4);
  });
  it("retire un abonné quand on ne suit plus", () => {
    expect(nextFollowerCount(3, true)).toBe(2);
  });
  it("ne descend jamais sous zéro", () => {
    expect(nextFollowerCount(0, true)).toBe(0);
  });
});

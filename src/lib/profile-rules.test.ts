import { describe, expect, it } from "vitest";

import {
  avatarStoragePath,
  canEditProfile,
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

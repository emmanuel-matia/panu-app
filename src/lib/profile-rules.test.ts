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

import { coverStoragePath, validateUsername } from "./profile-rules";

describe("validateUsername", () => {
  it("accepte « kin_music.243 »", () => {
    expect(validateUsername("kin_music.243")).toBeNull();
  });
  it("refuse un nom de 2 caractères", () => {
    expect(validateUsername("ab")).not.toBeNull();
  });
  it("refuse un nom de 31 caractères", () => {
    expect(validateUsername("a".repeat(31))).not.toBeNull();
  });
  it("refuse les majuscules et les espaces", () => {
    expect(validateUsername("Kin Music")).not.toBeNull();
  });
});

describe("coverStoragePath", () => {
  it("range la couverture dans le dossier de l'utilisateur", () => {
    expect(coverStoragePath("u1", "image/png", 42)).toBe("u1/cover-42.png");
  });
});

import { suggestionLabel } from "./profile-rules";

describe("suggestionLabel", () => {
  it("libelle chaque raison de suggestion", () => {
    expect(suggestionLabel("vous_suit", 0)).toBe("Vous suit");
    expect(suggestionLabel("amis_communs", 3)).toBe("3 en commun");
    expect(suggestionLabel("actif", 4)).toBe("Créateur actif");
    expect(suggestionLabel("nouveau", 0)).toBe("Nouveau membre");
    expect(suggestionLabel("autre", 0)).toBe("Suggestion");
  });
});

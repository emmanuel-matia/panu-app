import { describe, expect, it } from "vitest";

import { canDeleteAccount, validateNewPassword } from "./account-rules";

describe("règles du compte", () => {
  it("refuse un mot de passe de moins de 8 caractères", () => {
    expect(validateNewPassword("abc1234", "abc1234")).not.toBeNull();
  });
  it("accepte 8 caractères identiques à la confirmation", () => {
    expect(validateNewPassword("abcd1234", "abcd1234")).toBeNull();
  });
  it("refuse une confirmation différente", () => {
    expect(validateNewPassword("abcd1234", "abcd12345")).not.toBeNull();
  });
  it("exige le mot SUPPRIMER pour supprimer le compte", () => {
    expect(canDeleteAccount("supprimer")).toBe(false);
    expect(canDeleteAccount("SUPPRIMER")).toBe(true);
  });
});

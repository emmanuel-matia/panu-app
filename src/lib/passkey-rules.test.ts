import { describe, expect, it } from "vitest";

import {
  CHALLENGE_TTL_SECONDS,
  deviceLabelFromUserAgent,
  isChallengeExpired,
  isStepUpFresh,
  isStepUpRequiredError,
  isThrottled,
  MAX_CHALLENGES_PER_IP,
  requiredStepUpMethod,
  STEP_UP_MINUTES,
} from "./passkey-rules";

const now = new Date("2026-11-02T20:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

describe("confirmation renforcée", () => {
  it("dure 10 minutes", () => {
    expect(STEP_UP_MINUTES).toBe(10);
    expect(isStepUpFresh(ago(9), now, "passkey", 1)).toBe(true);
    expect(isStepUpFresh(ago(11), now, "passkey", 1)).toBe(false);
  });
  it("exige la passkey dès que le compte en possède une", () => {
    expect(requiredStepUpMethod(1)).toBe("passkey");
    expect(isStepUpFresh(ago(1), now, "password", 1)).toBe(false);
  });
  it("accepte le mot de passe en secours sans passkey", () => {
    expect(requiredStepUpMethod(0)).toBe("password");
    expect(isStepUpFresh(ago(1), now, "password", 0)).toBe(true);
  });
  it("refuse une date dans le futur", () => {
    expect(isStepUpFresh(ago(-5), now, "passkey", 1)).toBe(false);
  });
  it("reconnaît l'erreur renvoyée par la base", () => {
    expect(isStepUpRequiredError("Confirmation de sécurité requise")).toBe(true);
    expect(isStepUpRequiredError("Réservé au fondateur")).toBe(false);
  });
});

describe("défis WebAuthn", () => {
  it("expirent après 5 minutes", () => {
    expect(CHALLENGE_TTL_SECONDS).toBe(300);
    expect(isChallengeExpired(new Date(now.getTime() + 1000), now)).toBe(false);
    expect(isChallengeExpired(now, now)).toBe(true);
  });
  it("sont limités à 30 par adresse IP", () => {
    expect(MAX_CHALLENGES_PER_IP).toBe(30);
    expect(isThrottled(29)).toBe(false);
    expect(isThrottled(30)).toBe(true);
  });
});

describe("nom d'appareil", () => {
  it("n'expose que le système", () => {
    expect(deviceLabelFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120")).toBe("Android");
    expect(deviceLabelFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("iPhone / iPad");
  });
});

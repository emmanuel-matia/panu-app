import { describe, expect, it } from "vitest";

import {
  autoplayAllowed,
  effectiveDataMode,
  heavyUploadBlocked,
  uploadImageTarget,
  videoPreload,
} from "./data-saver-rules";
import { parsePrefs } from "./prefs";

describe("économie de données", () => {
  it("équilibrée par défaut", () => {
    expect(parsePrefs({}).data_mode).toBe("balanced");
    expect(parsePrefs({ data_mode: "n'importe" }).data_mode).toBe("balanced");
  });
  it("une connexion 2G/3G ou l'économiseur Android impose l'économie maximale", () => {
    expect(effectiveDataMode("high", false, { effectiveType: "3g" })).toBe("max");
    expect(effectiveDataMode("balanced", false, { saveData: true })).toBe("max");
    expect(effectiveDataMode("high", false, { effectiveType: "4g" })).toBe("high");
  });
  it("pas de lecture automatique en économie maximale", () => {
    expect(autoplayAllowed("max", false, { type: "wifi" })).toBe(false);
    expect(autoplayAllowed("balanced", false, undefined)).toBe(true);
  });
  it("Wi-Fi uniquement bloque la lecture auto et les envois lourds en données mobiles", () => {
    expect(autoplayAllowed("balanced", true, { type: "cellular" })).toBe(false);
    expect(heavyUploadBlocked(true, { type: "cellular" })).toBe(true);
    expect(heavyUploadBlocked(true, { type: "wifi" })).toBe(false);
  });
  it("seule la vidéo à l'écran se précharge, jamais en économie maximale", () => {
    expect(videoPreload("balanced", false)).toBe("none");
    expect(videoPreload("balanced", true)).toBe("metadata");
    expect(videoPreload("max", true)).toBe("none");
  });
  it("photos réduites à 1080 px en économie maximale", () => {
    expect(uploadImageTarget("max").maxSide).toBe(1080);
  });
});

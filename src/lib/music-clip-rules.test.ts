import { describe, expect, it } from "vitest";

import { beatPulse, checkClipMedia, detectBeats, pickRecorderMime, planSegments } from "./music-clip-rules";

function clicks(times: number[], duration: number, rate = 22050): Float32Array {
  const s = new Float32Array(Math.round(duration * rate));
  for (const t of times) {
    const start = Math.round(t * rate);
    for (let i = 0; i < 1500 && start + i < s.length; i++) s[start + i] = Math.sin(i / 3) * Math.exp(-i / 400);
  }
  return s;
}

describe("détection du rythme", () => {
  it("retrouve des temps forts réguliers à ±50 ms", () => {
    const times = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
    const beats = detectBeats(clicks(times, 4), 22050);
    expect(beats.length).toBe(times.length);
    beats.forEach((b, i) => expect(Math.abs(b - (times[i] as number))).toBeLessThan(0.05));
  });
  it("ne trouve rien dans le silence", () => {
    expect(detectBeats(new Float32Array(22050 * 3), 22050)).toEqual([]);
  });
});

describe("découpage du clip", () => {
  it("coupe sur les temps forts, en respectant 1,4 s minimum par plan", () => {
    const segs = planSegments([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5], 6, 3);
    expect(segs.map((s) => s.start)).toEqual([0, 1.5, 3, 4.5]);
    expect(segs.at(-1)?.end).toBe(6);
    expect(segs.map((s) => s.media)).toEqual([0, 1, 2, 0]);
  });
  it("ajoute une coupe toutes les 4 s quand il n'y a pas de rythme", () => {
    const segs = planSegments([], 10, 2);
    expect(segs.map((s) => s.start)).toEqual([0, 4, 8]);
  });
  it("un seul média couvre tout le morceau", () => {
    expect(planSegments([1, 2, 3], 30, 1)).toEqual([{ start: 0, end: 30, media: 0 }]);
  });
  it("fusionne un dernier plan de moins de 0,8 s", () => {
    const segs = planSegments([2, 4], 4.5, 2);
    expect(segs.at(-1)).toEqual({ start: 2, end: 4.5, media: 1 });
  });
});

describe("impulsion et formats", () => {
  it("l'impulsion vaut 1 sur le temps fort puis retombe à 0", () => {
    expect(beatPulse(1, [1])).toBe(1);
    expect(beatPulse(1.11, [1])).toBeCloseTo(0.5, 1);
    expect(beatPulse(1.5, [1])).toBe(0);
    expect(beatPulse(0.5, [1])).toBe(0);
  });
  it("préfère le MP4 quand il est disponible", () => {
    expect(pickRecorderMime((m) => m.startsWith("video/webm"))).toBe("video/webm;codecs=vp9,opus");
    expect(pickRecorderMime((m) => m === "video/mp4")).toBe("video/mp4");
    expect(pickRecorderMime(() => false)).toBeNull();
  });
  it("refuse les photos de plus de 15 Mo et les formats inconnus", () => {
    expect(checkClipMedia({ type: "image/jpeg", size: 16 * 1024 * 1024 })).toEqual({ error: "Photo trop lourde (15 Mo maximum)." });
    expect(checkClipMedia({ type: "image/heic", size: 100 })).toHaveProperty("error");
    expect(checkClipMedia({ type: "video/mp4", size: 100 })).toEqual({ kind: "video" });
  });
});

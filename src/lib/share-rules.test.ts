import { describe, expect, it } from "vitest";

import { shareDescription, shareImageUrl, shareStatsLine } from "./share-rules";

describe("share-rules", () => {
  it("affiche les vrais compteurs de vues et J'aime", () => {
    expect(shareStatsLine(1234, 56)).toBe("1 234 vues · 56 J'aime");
    expect(shareStatsLine(1, 0)).toBe("1 vue · 0 J'aime");
  });
  it("inclut le créateur et son @pseudo", () => {
    const d = shareDescription({ authorDisplayName: "Emmanuel", authorUsername: "emma", caption: null, viewsCount: 3, likesCount: 2 });
    expect(d).toBe("Emmanuel (@emma) · 3 vues · 2 J'aime — sur panu.site");
  });
  it("n'utilise jamais une vidéo comme image d'aperçu", () => {
    expect(shareImageUrl({ kind: "video", coverUrl: null, mediaUrl: "x.mp4" })).toBeNull();
    expect(shareImageUrl({ kind: "image", coverUrl: null, mediaUrl: "a.jpg" })).toBe("a.jpg");
    expect(shareImageUrl({ kind: "video", coverUrl: null, mediaUrl: "x.mp4", authorAvatarUrl: "av.jpg" })).toBe("av.jpg");
    expect(shareImageUrl({ kind: "image", coverUrl: null, mediaUrl: "a.jpg", authorAvatarUrl: "av.jpg" })).toBe("a.jpg");
  });
});

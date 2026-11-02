import { describe, expect, it } from "vitest";

import { postsForTab, profileTabsFor } from "./profile-rules";

describe("profileTabsFor", () => {
  it("shows Enregistrés to the owner", () => {
    expect(profileTabsFor(true)).toEqual(["publications", "videos", "reels", "photos", "stories", "enregistres"]);
  });
  it("hides Enregistrés from other visitors", () => {
    expect(profileTabsFor(false)).not.toContain("enregistres");
  });
});

describe("postsForTab", () => {
  const posts = [
    { id: "1", kind: "video" },
    { id: "2", kind: "image" },
    { id: "3", kind: "audio" },
  ];
  it("Vidéos keeps only videos", () => {
    expect(postsForTab("videos", posts).map((p) => p.id)).toEqual(["1"]);
  });
  it("Photos keeps only images", () => {
    expect(postsForTab("photos", posts).map((p) => p.id)).toEqual(["2"]);
  });
  it("Publications keeps everything", () => {
    expect(postsForTab("publications", posts)).toHaveLength(3);
  });
});

describe("Reels", () => {
  it("ne garde que les vidéos de 90 secondes ou moins", () => {
    const posts = [
      { kind: "video", mediaDuration: 30 },
      { kind: "video", mediaDuration: 90 },
      { kind: "video", mediaDuration: 91 },
      { kind: "video", mediaDuration: null },
      { kind: "image", mediaDuration: 5 },
    ];
    expect(postsForTab("reels", posts)).toEqual([posts[0], posts[1]]);
  });
});

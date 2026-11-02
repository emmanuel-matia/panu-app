import { describe, expect, it } from "vitest";

import { creatorsFromPosts, photosAndAi, popularHashtags, popularVideos, uniquePosts } from "./discover-rules";

function post(over: Partial<Parameters<typeof creatorsFromPosts>[0][number]> & { id: string }) {
  return {
    kind: "video" as const,
    source: "upload",
    title: "t",
    caption: null,
    authorId: "a1",
    authorUsername: "a1",
    authorDisplayName: "A1",
    authorAvatarUrl: null,
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    score: 0,
    createdAt: "2026-11-01T00:00:00Z",
    ...over,
  };
}

describe("Découvrir : calculs à partir des vraies publications", () => {
  it("compte chaque hashtag une fois par publication et classe par fréquence", () => {
    const tags = popularHashtags([
      { title: "Danse #Kinshasa #kinshasa", caption: "#rumba" },
      { title: "x", caption: "Belle soirée #Kinshasa" },
      { title: "y", caption: null },
    ]);
    expect(tags).toEqual([
      { tag: "kinshasa", count: 2 },
      { tag: "rumba", count: 1 },
    ]);
  });

  it("n'invente aucun hashtag quand il n'y a pas de publication", () => {
    expect(popularHashtags([])).toEqual([]);
  });

  it("les vidéos populaires excluent les contenus déjà en tendance et les non-vidéos", () => {
    const list = [
      post({ id: "1", viewsCount: 10 }),
      post({ id: "2", viewsCount: 50 }),
      post({ id: "3", viewsCount: 99, kind: "image" }),
    ];
    expect(popularVideos(list, new Set(["2"])).map((p) => p.id)).toEqual(["1"]);
  });

  it("les photos et créations IA regroupent les images et les publications IA", () => {
    const list = [post({ id: "1" }), post({ id: "2", kind: "image" }), post({ id: "3", source: "ai" })];
    expect(photosAndAi(list).map((p) => p.id)).toEqual(["2", "3"]);
  });

  it("les créateurs viennent des auteurs réels, sans moi, les plus regardés d'abord", () => {
    const list = [
      post({ id: "1", authorId: "me", authorUsername: "me", viewsCount: 999 }),
      post({ id: "2", authorId: "b", authorUsername: "b", viewsCount: 5 }),
      post({ id: "3", authorId: "c", authorUsername: "c", viewsCount: 20 }),
      post({ id: "4", authorId: "b", authorUsername: "b", viewsCount: 30 }),
    ];
    expect(creatorsFromPosts(list, "me").map((c) => [c.id, c.posts, c.views])).toEqual([
      ["b", 2, 35],
      ["c", 1, 20],
    ]);
  });

  it("fusionne sans doublon", () => {
    expect(uniquePosts([{ id: "1" }, { id: "2" }], [{ id: "2" }, { id: "3" }]).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
});

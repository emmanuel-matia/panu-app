import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, Flame, Hash, Heart, Image as ImageIcon, Loader2, Music2, Play, Search, Sparkles, Users, Video, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useSignedAvatars } from "@/components/profile/PersonRow";
import { VideoPostList } from "@/components/video/VideoPostList";
import { compactCount, timeAgo } from "@/components/video/time";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isPostCategory, matchesSearch, POST_CATEGORIES } from "@/lib/categories";
import { creatorsFromPosts, photosAndAi, popularHashtags, popularVideos, uniquePosts } from "@/lib/discover-rules";
import { listPosts, type FeedPost } from "@/lib/posts.functions";
import { cn } from "@/lib/utils";

const SCOPES = [
  { id: "tout", label: "Tout" },
  { id: "utilisateurs", label: "Créateurs" },
  { id: "videos", label: "Publications" },
  { id: "hashtags", label: "Hashtags" },
] as const;

export const Route = createFileRoute("/decouvrir")({
  validateSearch: z.object({
    q: z.string().max(80).optional(),
    categorie: z.string().max(30).optional(),
    filtre: z.enum(["tout", "utilisateurs", "videos", "hashtags"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Découvrir — PANU" },
      {
        name: "description",
        content:
          "Découvrez les vidéos populaires, les publications récentes, les créateurs, les photos et créations IA et les hashtags du moment sur PANU.",
      },
      { property: "og:title", content: "Découvrir — PANU" },
      { property: "og:description", content: "Vidéos populaires, créateurs, photos IA et tendances de la communauté PANU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DecouvrirPage,
});

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="px-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className="size-4 text-electric" /> {title}
        </h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Vignette d'une publication publique (couverture, image, ou aperçu vidéo). */
function PostThumb({ post, wide = false }: { post: FeedPost; wide?: boolean }) {
  const image = post.kind === "image" ? post.mediaUrl : post.coverUrl;
  return (
    <Link
      to="/p/$postId"
      params={{ postId: post.id }}
      className={cn("group relative block shrink-0 overflow-hidden rounded-2xl border border-border bg-surface", wide ? "w-full" : "w-32")}
    >
      <div className="relative aspect-[3/4] bg-muted">
        {image ? (
          <img src={image} alt={post.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : post.kind === "video" && post.mediaUrl ? (
          <video src={`${post.mediaUrl}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-brand">
            <Music2 className="size-8 text-primary-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        {post.kind === "video" ? (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/70 backdrop-blur">
            <Play className="size-3 fill-current text-foreground" />
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-2">
          <p className="line-clamp-2 text-xs leading-tight font-semibold text-foreground">{post.title}</p>
          <p className="flex items-center gap-2 text-[0.625rem] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Heart className="size-3" /> {compactCount(post.likesCount)}</span>
            <span className="flex items-center gap-0.5"><Eye className="size-3" /> {compactCount(post.viewsCount)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function Rail({ posts, empty }: { posts: FeedPost[]; empty: string }) {
  if (posts.length === 0) {
    return <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {posts.map((p) => <PostThumb key={p.id} post={p} />)}
    </div>
  );
}

function DecouvrirPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/decouvrir" });
  const { user } = useAuth();
  const [text, setText] = useState(search.q ?? "");
  const scope = search.filtre ?? "tout";
  const categorie = isPostCategory(search.categorie) ? search.categorie : undefined;
  const q = search.q ?? "";
  const active = Boolean(q || categorie);

  useEffect(() => setText(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text.trim() !== q) void navigate({ search: (s) => ({ ...s, q: text.trim() || undefined }), replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [text, q, navigate]);

  const trending = useQuery({ queryKey: ["posts", "discover", "trending"], queryFn: () => listPosts({ data: { mode: "trending" } }), staleTime: 60_000 });
  const recent = useQuery({ queryKey: ["posts", "discover", "recent"], queryFn: () => listPosts({ data: { mode: "recent" } }), staleTime: 60_000 });
  const loading = trending.isPending || recent.isPending;
  const failed = trending.isError && recent.isError;

  const model = useMemo(() => {
    const t = trending.data ?? [];
    const r = recent.data ?? [];
    const all = uniquePosts(t, r);
    const tendance = [...t].sort((a, b) => b.score - a.score).slice(0, 8);
    const used = new Set(tendance.map((p) => p.id));
    return {
      all,
      tendance,
      videos: popularVideos(all, used),
      recent: r.slice(0, 6),
      photos: photosAndAi(all),
      tags: popularHashtags(all),
      creators: creatorsFromPosts(all, user?.id),
    };
  }, [trending.data, recent.data, user?.id]);

  const avatars = useSignedAvatars(
    model.creators.map((c) => ({ id: c.id, username: c.username, display_name: c.displayName, avatar_url: null })),
  );
  void avatars;

  // Créateurs correspondant à la recherche (comptes connectés : annuaire complet des profils recherchables).
  const people = useQuery({
    queryKey: ["discover-people", q],
    enabled: Boolean(user) && q.length >= 2 && scope !== "videos" && scope !== "hashtags",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles", { _q: q.replace(/^@/, "") });
      if (error) throw error;
      return data ?? [];
    },
  });
  const peopleAvatars = useSignedAvatars(people.data ?? []);

  const chips = (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {POST_CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => void navigate({ search: (prev) => ({ ...prev, categorie: categorie === c ? undefined : c }) })}
          aria-pressed={categorie === c}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
            categorie === c ? "border-electric bg-electric/15 text-foreground" : "border-border bg-surface text-surface-foreground",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );

  return (
    <AppShell title="Découvrir" subtitle="Vidéos, créateurs, photos et tendances">
      <div className="space-y-3 border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-2">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Rechercher un créateur, une publication, un #hashtag"
            aria-label="Rechercher sur PANU"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        {active ? (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void navigate({ search: (prev) => ({ ...prev, filtre: s.id === "tout" ? undefined : s.id }) })}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs",
                  scope === s.id ? "bg-brand font-semibold text-primary-foreground" : "border border-border font-medium text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        {chips}
      </div>

      {active ? (
        <>
          {(people.data?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-border border-b border-border">
              {people.data!.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Link to="/@{$username}" params={{ username: p.username }} className="flex min-w-0 flex-1 items-center gap-3">
                    <ProfileAvatar url={p.avatar_url ? peopleAvatars[p.avatar_url] : null} alt={`Avatar de ${p.display_name}`} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{p.display_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <VideoPostList
            filterKey={`${q}|${categorie ?? ""}|${scope}`}
            filter={(p) => (!categorie || p.category === categorie) && matchesSearch(p, q, scope)}
            emptyTitle="Aucun résultat"
            emptyDescription={
              categorie && !q ? `Aucune publication récente dans la catégorie ${categorie}.` : "Essayez un autre mot-clé ou une autre catégorie."
            }
          />
        </>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : failed ? (
        <EmptyState icon={Sparkles} title="Découvrir indisponible" description="Les publications n'ont pas pu être chargées. Réessayez dans un instant." />
      ) : model.all.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Rien à découvrir pour l'instant"
          description="Aucune publication publique n'a encore été partagée. Publiez la première, ou créez-la avec un modèle IA."
          action={
            <Link to="/modeles" className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-semibold text-primary-foreground">
              Voir les modèles
            </Link>
          }
        />
      ) : (
        <div className="space-y-6 py-4">
          <Section icon={Flame} title="Tendances" hint="Les contenus qui montent en ce moment.">
            <Rail posts={model.tendance} empty="Aucun contenu tendance pour le moment." />
          </Section>
          <Section icon={Video} title="Vidéos populaires">
            <Rail posts={model.videos} empty="Pas d'autre vidéo populaire pour l'instant." />
          </Section>
          <Section icon={Users} title="Créateurs à découvrir" hint="Les créateurs de la communauté PANU.">
            {model.creators.length === 0 ? (
              <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">Aucun autre créateur pour le moment.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {model.creators.map((c) => (
                  <div key={c.id} className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-center">
                    <Link to="/@{$username}" params={{ username: c.username }} className="flex flex-col items-center gap-1.5">
                      <ProfileAvatar url={c.avatarUrl} alt={`Avatar de ${c.displayName}`} size="md" />
                      <span className="line-clamp-1 w-full text-sm font-semibold text-foreground">{c.displayName}</span>
                      <span className="line-clamp-1 w-full text-[0.6875rem] text-muted-foreground">@{c.username}</span>
                    </Link>
                    <p className="text-[0.625rem] text-muted-foreground">{c.posts} publication{c.posts > 1 ? "s" : ""}</p>
                    <FollowButton profileId={c.id} username={c.username} compact />
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section icon={Sparkles} title="Publications récentes">
            {model.recent.length === 0 ? (
              <p className="mx-4 text-xs text-muted-foreground">Aucune publication récente.</p>
            ) : (
              <ul className="space-y-1 px-4">
                {model.recent.map((p) => (
                  <li key={p.id}>
                    <Link to="/p/$postId" params={{ postId: p.id }} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
                        {p.kind === "video" ? <Video className="size-5" /> : p.kind === "image" ? <ImageIcon className="size-5" /> : <Music2 className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{p.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">@{p.authorUsername} · {timeAgo(p.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={ImageIcon} title="Photos et créations IA">
            <Rail posts={model.photos} empty="Aucune photo ni création IA publiée pour le moment." />
          </Section>
          <Section icon={Hash} title="Hashtags populaires">
            {model.tags.length === 0 ? (
              <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">Aucun hashtag utilisé pour l'instant.</p>
            ) : (
              <div className="flex flex-wrap gap-2 px-4">
                {model.tags.map((t) => (
                  <Link
                    key={t.tag}
                    to="/decouvrir"
                    search={{ q: `#${t.tag}`, filtre: "hashtags" }}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-electric"
                  >
                    #{t.tag} <span className="font-normal text-muted-foreground">· {t.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>
          <div className="px-4">
            <Link to="/modeles" className="flex items-center justify-between rounded-2xl bg-brand px-4 py-3.5 text-primary-foreground shadow-glow">
              <span>
                <span className="block font-semibold">Créez à votre tour</span>
                <span className="block text-xs opacity-90">Vidéos, photos et musiques avec les modèles IA</span>
              </span>
              <Sparkles className="size-6" />
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

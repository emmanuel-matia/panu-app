<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Public profile pages live at `/@{$username}` and load through the `getPublicProfile` server function with a publishable (anon) client, so SSR and social previews work without a session.
- Direct table reads on profiles, posts and follows are owner-only (no `USING (true)` policies); public data is served by security-definer SQL functions (`get_public_profile`, `list_video_posts`, `username_taken`, `is_published_video`) that return only public fields, to satisfy the security scanner.
- Avatars are stored in the private `avatars` bucket under `<user_id>/...`; `profiles.avatar_url` holds the storage path (not a URL) and is resolved to a signed URL when displayed, because the workspace blocks public buckets; direct storage read is owner-only, so other users' avatars are signed server-side (admin client) only for paths returned by the public SQL functions.
- Profile rules (who may edit, who may follow, avatar size/type, field lengths) live in `src/lib/profile-rules.ts` and are covered by vitest tests next to it — keep UI checks calling these helpers.
- Follows are rows in `public.follows` (follower_id, following_id); follower/following counts are computed in `getPublicProfile` from that table rather than stored on profiles, so they never drift.
- Videos are rows in `public.posts` (kind 'video') with files in the private `videos` bucket under `<user_id>/...`; direct storage read is owner-only; `listVideoPosts` signs URLs server-side (admin client) only for paths returned by `list_video_posts`, i.e. published videos.
- Video edits (trim start/end, volume, overlay text) are stored as post metadata and applied at playback by `useTrimPlayback`; files are never re-encoded, so no heavy video library is needed in the browser or Worker.
- AI video generation goes through `src/lib/video-ai.functions.ts` (Fal.ai queue, then PixVerse; create + client polling); each job is a `public.video_jobs` row whose `gateway_job_id` encodes the provider (`px_<id>` = PixVerse) so no extra column is needed, and the finished MP4 is copied into the `videos` bucket immediately because provider links expire.
- Video limits and validation live in `src/lib/video-rules.ts` with vitest tests next to it.
- The home page (`/`) uses `HomeHeader`, `StoriesRow`, `HomeShortcuts` and a fixed `StudioIaBar` (passed to `AppShell` via `header` / `bottomBar`); Studio IA tools open the existing studio via `/creer/video?mode=ai&outil=…` instead of a separate module. First-time visitors without a session are sent to `/bienvenue` unless they chose "Découvrir d'abord" (localStorage flag in `src/lib/discover.ts`).
- Studio IA calls the user's own provider keys from server functions only (`ai-text.functions.ts`, `ai-media.functions.ts`, `video-ai.functions.ts`), trying providers in order with `firstSuccessful` so one exhausted quota does not break a tool; `generateContent` returns `{ data }`.
- AI credits live in `public.user_credits` / `credit_transactions`, changed only by security-definer SQL functions (`claim_welcome_credits`, `spend_credits`, service-role `refund_credits`); server functions debit before generating via `withCredits` and refund on failure, and costs/welcome amount live in `src/lib/credits.ts` with tests.
- AI image/voice results are copied by the server function into the private `ai-images` / `ai-audio` buckets under `<user_id>/` and recorded in `public.ai_creations`; a failed generation stores nothing, so history only lists real successes.
- Feed videos play one at a time: `VideoPostCard` autoplays when 60 % visible and a module-level `claimPlayback` pauses the previous video, so sound never overlaps.
- Profile cover photos live in the `avatars` bucket (`<user_id>/cover-*`), path in `profiles.cover_url`, signed server-side like avatars.
- Feed interactions (likes, saves in `public.post_saves`, comments, views, shares) write directly through the browser client under owner-scoped RLS; counts and `liked_by_me` / `saved_by_me` come from `list_posts`.
- Explorer search and categories filter the latest posts returned by `list_posts` on the client (no search index yet).
- Profile pages (`/profil`, `/@{$username}`) share `ProfileTabs`; tab visibility/filtering lives in `profile-rules.ts` (`profileTabsFor`, `postsForTab`) with tests, and saved posts come from `listSavedPosts` (owner RLS on `post_saves`, then `list_posts` per id) so no new SQL function is needed.
- Row-to-DTO helpers shared by server functions live in `*.server.ts` (e.g. `posts.server.ts`), because top-level exports of `*.functions.ts` ship to the browser and break on server-only imports.

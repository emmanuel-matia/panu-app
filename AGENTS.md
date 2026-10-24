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
- Avatars are stored in the private `avatars` bucket under `<user_id>/...`; `profiles.avatar_url` holds the storage path (not a URL) and is resolved to a signed URL when displayed, because the workspace blocks public buckets.
- Profile rules (who may edit, who may follow, avatar size/type, field lengths) live in `src/lib/profile-rules.ts` and are covered by vitest tests next to it — keep UI checks calling these helpers.
- Follows are rows in `public.follows` (follower_id, following_id); follower/following counts are computed in `getPublicProfile` from that table rather than stored on profiles, so they never drift.
- Videos are rows in `public.posts` (kind 'video') with files in the private `videos` bucket under `<user_id>/...`; storage read is allowed only to the owner or when a post references the file, and feeds get signed URLs from `listVideoPosts` (publishable client).
- Video edits (trim start/end, volume, overlay text) are stored as post metadata and applied at playback by `useTrimPlayback`; files are never re-encoded, so no heavy video library is needed in the browser or Worker.
- AI video generation goes through `src/lib/video-ai.functions.ts` (gateway `/v1/videos`, create + client polling); each job is a `public.video_jobs` row and the finished MP4 is copied into the `videos` bucket immediately because gateway links expire.
- Video limits and validation live in `src/lib/video-rules.ts` with vitest tests next to it.

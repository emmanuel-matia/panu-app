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
- Avatars are stored in the private `avatars` bucket under `<user_id>/...`; `profiles.avatar_url` holds the storage path (not a URL) and is resolved to a signed URL when displayed, because the workspace blocks public buckets.
- Profile rules (who may edit, who may follow, avatar size/type, field lengths) live in `src/lib/profile-rules.ts` and are covered by vitest tests next to it — keep UI checks calling these helpers.
- Follows are rows in `public.follows` (follower_id, following_id); follower/following counts are computed in `getPublicProfile` from that table rather than stored on profiles, so they never drift.

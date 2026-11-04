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
- Public profiles live at `/@{$username}` via `getPublicProfile` with a publishable client, so SSR/social previews work signed out.
- Direct reads on profiles, posts and follows are owner-only; public data comes from security-definer SQL functions returning only public fields (scanner requirement).
- Private buckets only (workspace blocks public ones): `avatars` (avatars + `cover-*`), `videos` (all post media), `ai-images`, `ai-audio`, each under `<user_id>/`. Columns store paths; other users' files are signed server-side (admin client) only for paths returned by public SQL functions.
- Rules + vitest tests live in `src/lib/*-rules.ts` (profile, video, media, admin) and `credits.ts`; UI checks call these helpers.
- Follower/following counts are computed from `public.follows`, never stored, so they never drift.
- Video edits (trim, volume, overlay) are post metadata applied at playback by `useTrimPlayback`; files are never re-encoded.
- Studio IA calls the user's own provider keys from server functions only (`ai-text`, `ai-media`, `video-ai` `.functions.ts`) with `firstSuccessful` fallback; video jobs are `video_jobs` rows (`px_` prefix = PixVerse), inserted/updated only by the server (admin client, migration 0017) with the exact `credit_cost` so failures refund once and users cannot fabricate refundable jobs; finished files are copied to storage at once because provider links expire.
- AI credits (`user_credits`, `credit_transactions`) change only via security-definer SQL (`claim_welcome_credits`, `spend_credits`, service-role `refund_credits`); `withCredits` debits first and refunds on failure. Failed generations store nothing.
- Home `/` = `HomeHeader`, `StoriesRow`, `HomeShortcuts`, fixed `StudioIaBar` via `AppShell` props; Studio IA tools open `/creer/video?mode=ai&outil=…`. Main entry points are Découvrir (`/decouvrir`, old `/explorer` redirects) and Modèles (`/modeles`), both in `BottomNav` and as the two big `HomeShortcuts` cards. Signed-out first visits go to `/bienvenue` unless the `discover.ts` flag is set.
- Feed: one video plays at a time (`claimPlayback`); likes/saves/comments/views/shares write via the browser client under owner RLS; counts and `*_by_me` come from `list_posts`; Découvrir builds its sections (trending, popular videos, creators, hashtags, photos/IA) client-side from `list_posts` via `discover-rules.ts`, never from invented data.
- `/profil` and `/@{$username}` share `ProfileTabs`; tab logic in `profile-rules.ts`; saved posts via `listSavedPosts`.
- Server-only DTO helpers live in `*.server.ts`, since top-level exports of `*.functions.ts` ship to the browser.
- Settings: sections declared once in `settings-config.ts`, bodies registered in `components/settings/registry.tsx`, one route `/parametres/$section`. Prefs live in `user_settings.prefs` parsed by `prefs.ts`; unapplied settings use `pending`. Global effects in `PrefsEffects` + inline appearance script.
- Social rules are enforced in the database (blocks, follow policy, comment permission, `can_view_post`, founder auto-follow, `redeem_referral`, hashed `match_contacts`); people lists come from security-definer RPCs with avatars signed by `signAvatars`.
- Staff: founder = `platform_founder` row, admin = `user_roles`; access decided only by `is_founder`/`is_staff`/`my_staff_role` and `admin_*` security-definer functions that re-check the caller. Role/founder/audit tables have no app write grants. `/admin` UI only calls those RPCs; moderation storage cleanup runs in `admin.functions.ts` after the RPC authorizes.
- Post reports go to `content_reports` (insert-own RLS, trigger fills author/title); staff use `admin_list_reports` / `admin_resolve_report`.
- Official legal texts live as data in `src/lib/legal-documents.ts` (rendered by `LegalPage`, one thin route per document, listed in `settings-config.ts`); edit the data, never the routes.
- Legal consent proof lives in `legal_consents`, written only by the `record_legal_consent` RPC (server date); signup/Google store a pending consent (localStorage + signUp metadata) that `useAuth` records on first session; `ConsentBanner` asks accounts lacking the current version.
- Anon has no table grants; security-definer functions are executable only by `authenticated` unless whitelisted in migration 0015 (public RPCs: get_public_profile, list_posts, list_comments, list_video_posts, username_taken, plus `list_templates` from 0017). Any new function or table needs explicit GRANTs — why: least privilege after the security audit.
- Biometrics = WebAuthn passkeys only (`passkeys.server.ts` / `.functions.ts`, `@simplewebauthn`): PANU stores public keys, never biometric data; challenges are single-use server rows; passkey login mints a magic-link token hash the browser redeems with `verifyOtp`. Sensitive founder RPCs call `assert_step_up()` (fresh `step_up_events` row; passkey required once one exists, password fallback otherwise) — why: the server, not the UI, must enforce re-confirmation.
- AI templates (`ai_templates`, music studio, browser-rendered clips): rules in `src/components/templates/AGENTS.md`.
- Subdirectories may have their own `AGENTS.md`; read it before changing files there.
- Production crash guard: `tsyringe` is aliased to `src/lib/tsyringe-entry.ts` (nitro alias in `vite.config.ts`, files kept via `sideEffects` in package.json) — why: `@simplewebauthn` → x509 → tsyringe threw at Worker startup and every published page returned 500. Check new server deps with `vite build` + `wrangler dev -c dist/server/wrangler.json`.

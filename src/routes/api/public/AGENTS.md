# Public API routes

- Share cards: every post/profile/live emits og:image pointing to `/api/public/og/...` routes that proxy the real media bytes (crawlers mishandle redirects) and fall back to the staff-set default image/logo from `share_settings` (read via `get_share_settings`, written only by `admin_update_share_settings`) — why: never show the homepage screenshot for content with its own media.

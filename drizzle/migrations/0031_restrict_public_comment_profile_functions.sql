CREATE OR REPLACE FUNCTION public.list_comments(_post_id uuid)
 RETURNS TABLE(id uuid, parent_id uuid, body text, created_at timestamp with time zone, author_id uuid, author_username text, author_display_name text, author_avatar_url text, can_delete boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.id, c.parent_id, c.body, c.created_at, c.author_id, p.username, p.display_name, p.avatar_url,
    (auth.uid() IS NOT NULL AND (c.author_id = auth.uid() OR public.is_post_owner(c.post_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')))
  FROM public.post_comments c
  JOIN public.posts po ON po.id = c.post_id
  JOIN public.profiles ap ON ap.id = po.author_id
  JOIN public.profiles p ON p.id = c.author_id
  WHERE c.post_id = _post_id
    AND public.can_view_post(po.author_id, po.visibility, ap.is_locked, ap.deactivated_at)
    AND p.deactivated_at IS NULL
    AND (auth.uid() IS NULL OR NOT public.is_blocked_between(auth.uid(), c.author_id))
  ORDER BY c.created_at
  LIMIT 300
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
 RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, cover_url text, bio text, created_at timestamp with time zone, followers_count bigint, following_count bigint, posts_count bigint, website text, city text, country text, social_links jsonb, is_professional boolean, is_locked boolean, is_founder boolean, follow_policy text, online boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.cover_url, p.bio, p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id),
    (SELECT count(*) FROM public.posts po WHERE po.author_id = p.id AND po.visibility = 'public'),
    CASE WHEN coalesce((s.prefs->>'show_website')::boolean, true) THEN p.website END,
    CASE WHEN coalesce((s.prefs->>'show_location')::boolean, true) THEN p.city END,
    CASE WHEN coalesce((s.prefs->>'show_location')::boolean, true) THEN p.country END,
    CASE WHEN coalesce((s.prefs->>'show_social')::boolean, true) THEN p.social_links ELSE '{}'::jsonb END,
    p.is_professional, p.is_locked, p.id = public.founder_id(), p.follow_policy,
    CASE WHEN p.show_online THEN coalesce(p.last_seen_at > now() - interval '5 minutes', false) END
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE lower(p.username) = lower(_username) AND p.deactivated_at IS NULL
    AND (auth.uid() IS NULL OR auth.uid() = p.id OR NOT public.is_blocked_between(auth.uid(), p.id))
  LIMIT 1
$function$;
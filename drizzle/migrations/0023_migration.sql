create or replace function public.get_story_share(_story_id uuid)
returns table(id uuid, author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  media_path text, media_type text, overlay_text text, created_at timestamptz, expires_at timestamptz,
  is_expired boolean, can_view boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.author_id, p.username, p.display_name, p.avatar_url,
    case when v.ok then s.media_path end, s.media_type,
    case when v.ok then s.overlay_text end, s.created_at, s.expires_at,
    s.expires_at <= now(), v.ok
  from public.stories s join public.profiles p on p.id = s.author_id
  cross join lateral (select (s.expires_at > now() and auth.uid() is not null and p.deactivated_at is null
     and not public.is_blocked_between(auth.uid(), s.author_id)
     and (s.author_id = auth.uid() or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = s.author_id))) as ok) v
  where s.id = _story_id and p.deactivated_at is null;
$$;
revoke all on function public.get_story_share(uuid) from public;
grant execute on function public.get_story_share(uuid) to anon, authenticated;
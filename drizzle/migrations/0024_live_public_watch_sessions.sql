CREATE TABLE public.live_watch_sessions (
 token_hash text PRIMARY KEY,
 stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
 rtc_session_id text NOT NULL UNIQUE,
 user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz,
 left_at timestamptz
);
GRANT ALL ON public.live_watch_sessions TO service_role;
ALTER TABLE public.live_watch_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX live_watch_active_idx ON public.live_watch_sessions(stream_id,last_seen_at) WHERE left_at IS NULL;
CREATE OR REPLACE FUNCTION public.get_live_public(_id uuid DEFAULT NULL) RETURNS TABLE(id uuid,title text,status text,started_at timestamptz,host_id uuid,host_username text,host_display_name text,host_avatar_url text,cover_path text,source_kind text,viewers_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.title,CASE WHEN s.status <> 'ended' AND s.last_heartbeat_at < now()-interval '60 seconds' THEN 'ended' ELSE s.status END,s.started_at,p.id,p.username,p.display_name,p.avatar_url,s.cover_path,s.source_kind,
 (SELECT count(DISTINCT coalesce(v.user_id::text,v.token_hash)) FROM public.live_watch_sessions v WHERE v.stream_id=s.id AND v.left_at IS NULL AND v.last_seen_at>now()-interval '15 seconds' AND v.user_id IS DISTINCT FROM s.host_id)
 FROM public.live_streams s JOIN public.profiles p ON p.id=s.host_id
 WHERE (_id IS NULL OR s.id=_id) AND p.deactivated_at IS NULL AND NOT p.is_locked AND NOT public.is_blocked_between(auth.uid(),s.host_id)
 AND (_id IS NOT NULL OR (s.status IN ('live','paused') AND s.last_heartbeat_at>now()-interval '60 seconds')) ORDER BY s.started_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_live_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_public(uuid) TO anon,authenticated,service_role;
CREATE FUNCTION public.live_host_audience(_id uuid) RETURNS TABLE(user_id uuid,username text,display_name text,avatar_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT DISTINCT p.id,p.username,p.display_name,p.avatar_url FROM public.live_watch_sessions v JOIN public.profiles p ON p.id=v.user_id JOIN public.live_streams s ON s.id=v.stream_id
 WHERE s.id=_id AND s.host_id=auth.uid() AND v.user_id<>s.host_id AND v.left_at IS NULL AND v.last_seen_at>now()-interval '15 seconds';
$$;
REVOKE ALL ON FUNCTION public.live_host_audience(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_host_audience(uuid) TO authenticated;
COMMENT ON TABLE public.live_watch_sessions IS 'Server-only capability-bound WebRTC watch sessions; presence begins on video playback, expires after 15 seconds without heartbeat. No anonymous table access.';
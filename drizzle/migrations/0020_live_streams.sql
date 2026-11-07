CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Live PANU',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','paused','ended')),
  cf_session_id text,
  video_track text,
  audio_track text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  peak_viewers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_streams_active_idx ON public.live_streams (status, last_heartbeat_at DESC);
CREATE INDEX live_streams_host_idx ON public.live_streams (host_id, created_at DESC);
GRANT SELECT ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts read own lives" ON public.live_streams FOR SELECT TO authenticated USING (host_id = auth.uid());

CREATE TABLE public.live_viewers (
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, viewer_id)
);
GRANT ALL ON public.live_viewers TO service_role;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;

-- Lives actifs (heartbeat < 60 s), sans les comptes bloqués ; champs publics uniquement.
CREATE OR REPLACE FUNCTION public.list_live_streams()
RETURNS TABLE (id uuid, title text, status text, started_at timestamptz, peak_viewers integer, total_viewers bigint,
  host_id uuid, host_username text, host_display_name text, host_avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.status, s.started_at, s.peak_viewers,
    (SELECT count(*) FROM public.live_viewers v WHERE v.stream_id = s.id),
    p.id, p.username, p.display_name, p.avatar_url
  FROM public.live_streams s JOIN public.profiles p ON p.id = s.host_id
  WHERE s.status IN ('live','paused') AND s.last_heartbeat_at > now() - interval '60 seconds'
    AND p.deactivated_at IS NULL
    AND NOT public.is_blocked_between(auth.uid(), s.host_id)
  ORDER BY s.started_at DESC LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.list_live_streams() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_live_streams() TO authenticated;
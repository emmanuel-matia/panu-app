ALTER TABLE public.live_streams ADD COLUMN cover_path text, ADD COLUMN source_kind text NOT NULL DEFAULT 'camera' CHECK(source_kind IN ('camera','prerecorded'));
ALTER TABLE public.live_viewers ADD COLUMN last_seen_at timestamptz, ADD COLUMN left_at timestamptz;
CREATE TABLE public.live_rtc_sessions (session_id text PRIMARY KEY, stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.live_rtc_sessions TO service_role;
ALTER TABLE public.live_rtc_sessions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.get_live_public(_id uuid DEFAULT NULL) RETURNS TABLE(id uuid,title text,status text,started_at timestamptz,host_id uuid,host_username text,host_display_name text,host_avatar_url text,cover_path text,source_kind text,viewers_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.title,CASE WHEN s.status <> 'ended' AND s.last_heartbeat_at < now()-interval '60 seconds' THEN 'ended' ELSE s.status END,s.started_at,p.id,p.username,p.display_name,p.avatar_url,s.cover_path,s.source_kind,
 (SELECT count(*) FROM public.live_viewers v WHERE v.stream_id=s.id AND v.left_at IS NULL AND v.last_seen_at>now()-interval '35 seconds' AND v.viewer_id<>s.host_id)
 FROM public.live_streams s JOIN public.profiles p ON p.id=s.host_id
 WHERE (_id IS NULL OR s.id=_id) AND p.deactivated_at IS NULL AND NOT p.is_locked AND NOT public.is_blocked_between(auth.uid(),s.host_id)
 AND (_id IS NOT NULL OR (s.status IN ('live','paused') AND s.last_heartbeat_at>now()-interval '60 seconds')) ORDER BY s.started_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_live_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_public(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_join_live(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.get_live_public(_id) WHERE status IN ('live','paused')) $$;
REVOKE ALL ON FUNCTION public.can_join_live(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_join_live(uuid) TO authenticated,service_role;
CREATE TABLE public.live_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,author_id uuid NOT NULL REFERENCES public.profiles(id),body text NOT NULL CHECK(char_length(btrim(body)) BETWEEN 1 AND 500),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.live_comments TO authenticated;
GRANT ALL ON public.live_comments TO service_role;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live participants read comments" ON public.live_comments FOR SELECT TO authenticated USING(public.can_join_live(stream_id) AND NOT public.is_blocked_between(auth.uid(),author_id));
CREATE POLICY "Live participants comment as self" ON public.live_comments FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.can_join_live(stream_id));
CREATE INDEX live_comments_stream_idx ON public.live_comments(stream_id,created_at);
CREATE OR REPLACE FUNCTION public.live_comment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.author_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(NEW.author_id::text));
 IF EXISTS(SELECT 1 FROM public.live_comments WHERE author_id=NEW.author_id AND created_at>now()-interval '3 seconds') THEN RAISE EXCEPTION 'Patientez avant votre prochain commentaire'; END IF;
 NEW.body:=btrim(NEW.body); NEW.created_at:=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.live_comment_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER live_comment_guard BEFORE INSERT ON public.live_comments FOR EACH ROW EXECUTE FUNCTION public.live_comment_guard();
CREATE OR REPLACE FUNCTION public.list_live_comments(_id uuid) RETURNS TABLE(id uuid,body text,created_at timestamptz,username text,display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT c.id,c.body,c.created_at,p.username,p.display_name FROM public.live_comments c JOIN public.profiles p ON p.id=c.author_id WHERE c.stream_id=_id AND public.can_join_live(_id) AND NOT public.is_blocked_between(auth.uid(),c.author_id) ORDER BY c.created_at DESC LIMIT 100 $$;
REVOKE ALL ON FUNCTION public.list_live_comments(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_live_comments(uuid) TO authenticated;
CREATE TABLE public.live_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),stream_id uuid NOT NULL REFERENCES public.live_streams(id),reporter_id uuid NOT NULL REFERENCES public.profiles(id),reason text NOT NULL CHECK(char_length(reason) BETWEEN 1 AND 500),created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(stream_id,reporter_id));
GRANT SELECT,INSERT ON public.live_reports TO authenticated;
GRANT ALL ON public.live_reports TO service_role;
ALTER TABLE public.live_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report a visible live" ON public.live_reports FOR INSERT TO authenticated WITH CHECK(reporter_id=auth.uid() AND public.can_join_live(stream_id));
CREATE POLICY "Staff read live reports" ON public.live_reports FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
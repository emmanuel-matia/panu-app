CREATE TABLE public.post_view_events (event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, user_id uuid, visitor_session_id uuid REFERENCES public.visitor_sessions(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK (user_id IS NOT NULL OR visitor_session_id IS NOT NULL));
GRANT ALL ON public.post_view_events TO service_role;
ALTER TABLE public.post_view_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX post_view_events_post ON public.post_view_events(post_id);
INSERT INTO public.post_view_events(post_id,user_id,visitor_session_id,created_at) SELECT post_id,user_id,visitor_session_id,min(created_at) FROM (SELECT post_id,viewer_id AS user_id,NULL::uuid AS visitor_session_id,created_at FROM public.post_views UNION ALL SELECT target_id,user_id,CASE WHEN user_id IS NULL THEN session_id END,created_at FROM public.public_engagement WHERE target_kind='post' AND action='view' AND hidden_at IS NULL) v GROUP BY post_id,user_id,visitor_session_id;
CREATE OR REPLACE FUNCTION public.post_view_counts(_ids uuid[]) RETURNS TABLE(post_id uuid,total_views bigint,unique_viewers bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,count(v.event_id),count(DISTINCT CASE WHEN v.user_id IS NOT NULL THEN 'u:'||v.user_id::text ELSE 'v:'||v.visitor_session_id::text END) FROM public.posts p JOIN public.profiles pr ON pr.id=p.author_id LEFT JOIN public.post_view_events v ON v.post_id=p.id WHERE p.id=ANY(_ids) AND public.can_view_post(p.author_id,p.visibility,pr.is_locked,pr.deactivated_at) GROUP BY p.id $$;
REVOKE ALL ON FUNCTION public.post_view_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_view_counts(uuid[]) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.record_public_post_consultation(_post uuid,_event uuid,_hash text,_user uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; p public.posts; pr public.profiles;
BEGIN
 SELECT id INTO sid FROM public.visitor_sessions WHERE token_hash=_hash AND expires_at>now();
 IF sid IS NULL THEN RAISE EXCEPTION 'Session expirée.'; END IF;
 SELECT * INTO p FROM public.posts WHERE id=_post; SELECT * INTO pr FROM public.profiles WHERE id=p.author_id;
 IF p.id IS NULL OR pr.deactivated_at IS NOT NULL OR pr.is_locked OR p.visibility<>'public' OR (_user IS NOT NULL AND public.is_blocked_between(_user,p.author_id)) THEN RAISE EXCEPTION 'Contenu inaccessible.'; END IF;
 INSERT INTO public.post_view_events(event_id,post_id,user_id,visitor_session_id) VALUES(_event,_post,_user,CASE WHEN _user IS NULL THEN sid END) ON CONFLICT(event_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_public_post_consultation(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_post_consultation(uuid,uuid,text,uuid) TO service_role;
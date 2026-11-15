CREATE TABLE public.visitor_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text UNIQUE NOT NULL, label bigint GENERATED ALWAYS AS IDENTITY, expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day', last_comment_at timestamptz, last_event_at timestamptz);
GRANT ALL ON public.visitor_sessions TO service_role;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.public_engagement (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid REFERENCES public.visitor_sessions(id) NOT NULL, user_id uuid, target_kind text NOT NULL, target_id uuid NOT NULL, action text NOT NULL, body text, parent_id uuid, channel text, share_ref uuid, created_at timestamptz NOT NULL DEFAULT now(), hidden_at timestamptz, CONSTRAINT engagement_kind CHECK (target_kind IN ('post','live')), CONSTRAINT engagement_action CHECK (action IN ('like','comment','view','share','arrival')));
GRANT ALL ON public.public_engagement TO service_role;
ALTER TABLE public.public_engagement ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX engagement_unique_reaction ON public.public_engagement (target_kind,target_id,action,session_id) WHERE action IN ('like','view');
CREATE UNIQUE INDEX engagement_unique_member ON public.public_engagement (target_kind,target_id,action,user_id) WHERE user_id IS NOT NULL AND action IN ('like','view');
CREATE UNIQUE INDEX engagement_unique_share ON public.public_engagement(share_ref) WHERE action='share';
CREATE UNIQUE INDEX engagement_unique_arrival ON public.public_engagement(session_id,share_ref) WHERE action='arrival';
CREATE INDEX engagement_target ON public.public_engagement(target_kind,target_id,created_at);
CREATE OR REPLACE FUNCTION public.visitor_engage(_hash text,_kind text,_target uuid,_action text,_user uuid DEFAULT NULL,_body text DEFAULT NULL,_parent uuid DEFAULT NULL,_channel text DEFAULT NULL,_ref uuid DEFAULT NULL,_liked boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.visitor_sessions; p public.posts; host public.profiles;
BEGIN
 SELECT * INTO s FROM public.visitor_sessions WHERE token_hash=_hash AND expires_at>now() FOR UPDATE;
 IF s.id IS NULL THEN RAISE EXCEPTION 'Session expirée.'; END IF;
 IF _kind='post' THEN
  SELECT * INTO p FROM public.posts WHERE id=_target;
  SELECT * INTO host FROM public.profiles WHERE id=p.author_id;
  IF p.id IS NULL OR host.deactivated_at IS NOT NULL OR host.is_locked OR p.visibility<>'public' OR (_user IS NOT NULL AND public.is_blocked_between(_user,host.id)) THEN RAISE EXCEPTION 'Contenu inaccessible.'; END IF;
  IF _action='comment' AND NOT p.allow_comments THEN RAISE EXCEPTION 'Commentaires désactivés.'; END IF;
 ELSIF _kind='live' THEN
  SELECT pr.* INTO host FROM public.live_streams l JOIN public.profiles pr ON pr.id=l.host_id WHERE l.id=_target AND l.status IN ('live','paused') AND l.last_heartbeat_at>now()-interval '60 seconds';
  IF host.id IS NULL OR host.deactivated_at IS NOT NULL OR host.is_locked OR (_user IS NOT NULL AND public.is_blocked_between(_user,host.id)) THEN RAISE EXCEPTION 'Direct inaccessible.'; END IF;
 ELSE RAISE EXCEPTION 'Contenu invalide.'; END IF;
 IF _action='comment' THEN
  IF char_length(trim(coalesce(_body,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Commentaire : 1 à 500 caractères.'; END IF;
  IF s.last_comment_at>now()-interval '5 seconds' OR (SELECT count(*) FROM public.public_engagement WHERE session_id=s.id AND action='comment' AND created_at>now()-interval '1 minute')>=6 THEN RAISE EXCEPTION 'Patientez avant de commenter à nouveau.'; END IF;
  IF EXISTS(SELECT 1 FROM public.public_engagement WHERE session_id=s.id AND target_id=_target AND action='comment' AND body=trim(_body) AND created_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Commentaire déjà envoyé.'; END IF;
  IF _parent IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.post_comments WHERE id=_parent AND post_id=_target UNION ALL SELECT 1 FROM public.public_engagement WHERE id=_parent AND target_id=_target AND target_kind=_kind AND action='comment' AND hidden_at IS NULL) THEN RAISE EXCEPTION 'Réponse invalide.'; END IF;
  UPDATE public.visitor_sessions SET last_comment_at=now() WHERE id=s.id;
 ELSIF _action='like' AND NOT _liked THEN
  DELETE FROM public.public_engagement WHERE target_kind=_kind AND target_id=_target AND action='like' AND (session_id=s.id OR (_user IS NOT NULL AND user_id=_user)); RETURN;
 ELSIF _action='arrival' THEN
  IF NOT EXISTS(SELECT 1 FROM public.public_engagement WHERE action='share' AND share_ref=_ref AND target_kind=_kind AND target_id=_target) THEN RETURN; END IF;
 ELSIF _action NOT IN ('like','view','share') THEN RAISE EXCEPTION 'Action invalide.';
 END IF;
 IF _action IN ('share','like') AND s.last_event_at>now()-interval '500 milliseconds' THEN RAISE EXCEPTION 'Patientez avant de réessayer.'; END IF;
 UPDATE public.visitor_sessions SET last_event_at=now() WHERE id=s.id;
 INSERT INTO public.public_engagement(session_id,user_id,target_kind,target_id,action,body,parent_id,channel,share_ref) VALUES(s.id,_user,_kind,_target,_action,CASE WHEN _action='comment' THEN trim(_body) END,_parent,_channel,_ref) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.visitor_engage(text,text,uuid,text,uuid,text,uuid,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_engage(text,text,uuid,text,uuid,text,uuid,text,uuid,boolean) TO service_role;
ALTER TABLE public.live_watch_sessions ADD COLUMN visitor_session_id uuid REFERENCES public.visitor_sessions(id);
CREATE OR REPLACE FUNCTION public.get_live_public(_id uuid DEFAULT NULL) RETURNS TABLE(id uuid,title text,status text,started_at timestamptz,host_id uuid,host_username text,host_display_name text,host_avatar_url text,cover_path text,source_kind text,viewers_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.title,CASE WHEN s.status<>'ended' AND s.last_heartbeat_at<now()-interval '60 seconds' THEN 'ended' ELSE s.status END,s.started_at,p.id,p.username,p.display_name,p.avatar_url,s.cover_path,s.source_kind,
 (SELECT count(DISTINCT coalesce(v.user_id::text,v.visitor_session_id::text,v.token_hash)) FROM public.live_watch_sessions v WHERE v.stream_id=s.id AND v.left_at IS NULL AND v.last_seen_at>now()-interval '15 seconds' AND v.user_id IS DISTINCT FROM s.host_id)
 FROM public.live_streams s JOIN public.profiles p ON p.id=s.host_id WHERE (_id IS NULL OR s.id=_id) AND p.deactivated_at IS NULL AND NOT p.is_locked AND NOT public.is_blocked_between(auth.uid(),s.host_id) AND (_id IS NOT NULL OR (s.status IN ('live','paused') AND s.last_heartbeat_at>now()-interval '60 seconds')) ORDER BY s.started_at DESC;
$$;
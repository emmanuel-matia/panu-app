CREATE OR REPLACE FUNCTION public.record_member_post_consultation(_post uuid,_event uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.posts; pr public.profiles;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
 SELECT * INTO p FROM public.posts WHERE id=_post; SELECT * INTO pr FROM public.profiles WHERE id=p.author_id;
 IF p.id IS NULL OR NOT public.can_view_post(p.author_id,p.visibility,pr.is_locked,pr.deactivated_at) THEN RAISE EXCEPTION 'Contenu inaccessible.'; END IF;
 INSERT INTO public.post_view_events(event_id,post_id,user_id) VALUES(_event,_post,auth.uid()) ON CONFLICT(event_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_member_post_consultation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_member_post_consultation(uuid,uuid) TO authenticated;
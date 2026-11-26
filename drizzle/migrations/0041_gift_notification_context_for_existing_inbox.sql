CREATE FUNCTION public.gift_notification_context() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('notificationId',n.id,'giftName',s.gift_name,'message',s.message,'targetKind',s.target_kind,'targetId',s.target_id))
 FROM (SELECT id,gift_send_id FROM public.notifications WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 100) n JOIN public.gift_sends s ON s.id=n.gift_send_id AND s.recipient_id=auth.uid()),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.gift_notification_context() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gift_notification_context() TO authenticated;
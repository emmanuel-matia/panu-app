CREATE FUNCTION public.gift_send_doorbell() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid;
BEGIN
 FOR u IN SELECT DISTINCT user_id FROM (SELECT sender_id AS user_id FROM new_gift_rows UNION SELECT recipient_id FROM new_gift_rows) x LOOP
  PERFORM realtime.send('{}'::jsonb,'gift_changed','panu-gifts:'||u::text,true);
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gift_send_doorbell() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER gift_sends_notify AFTER INSERT ON public.gift_sends REFERENCING NEW TABLE AS new_gift_rows FOR EACH STATEMENT EXECUTE FUNCTION public.gift_send_doorbell();
CREATE POLICY "Members receive only their own gift doorbell" ON realtime.messages FOR SELECT TO authenticated USING (realtime.topic()='panu-gifts:'||auth.uid()::text);
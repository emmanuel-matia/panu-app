ALTER TABLE public.live_panel_members ADD COLUMN invite_expires_at timestamptz, ADD COLUMN last_seen_at timestamptz, ADD COLUMN camera_off_by_host boolean NOT NULL DEFAULT false;
ALTER TABLE public.live_streams ADD COLUMN panel_capacity integer NOT NULL DEFAULT 4 CHECK (panel_capacity BETWEEN 1 AND 8);
CREATE OR REPLACE FUNCTION public.guard_live_panel_slot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.live_streams; used integer;
BEGIN
 SELECT * INTO s FROM public.live_streams WHERE id=NEW.stream_id FOR UPDATE;
 IF NEW.status IN ('requested','invited','accepted','connected') THEN
  IF s.status='ended' OR NOT s.panel_open THEN RAISE EXCEPTION 'Le panel est fermé.'; END IF;
  IF NEW.user_id=s.host_id AND NEW.role<>'host' THEN RAISE EXCEPTION 'Le présentateur ne peut pas être invité.'; END IF;
  IF NEW.role='guest' AND NEW.status IN ('invited','accepted','connected') THEN
   SELECT count(*) INTO used FROM public.live_panel_members WHERE stream_id=NEW.stream_id AND user_id<>NEW.user_id AND role='guest' AND status IN ('invited','accepted','connected') AND (invite_expires_at IS NULL OR invite_expires_at>now()) AND (status<>'connected' OR last_seen_at>now()-interval '30 seconds');
   IF used>=s.panel_capacity THEN RAISE EXCEPTION 'Toutes les places du panel sont occupées.'; END IF;
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.status IN ('invited','accepted') AND NEW.status IN ('accepted','connected') AND OLD.invite_expires_at<=now() THEN RAISE EXCEPTION 'Invitation expirée.'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_live_panel_slot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER live_panel_slot_guard BEFORE INSERT OR UPDATE ON public.live_panel_members FOR EACH ROW EXECUTE FUNCTION public.guard_live_panel_slot();
CREATE OR REPLACE FUNCTION public.live_panel_doorbell() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE host uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status AND NEW.updated_at=OLD.updated_at THEN RETURN NULL; END IF;
 SELECT host_id INTO host FROM public.live_streams WHERE id=NEW.stream_id;
 PERFORM realtime.send('{}'::jsonb,'panel_changed','panu-panel:'||NEW.user_id::text,true);
 IF host IS DISTINCT FROM NEW.user_id THEN PERFORM realtime.send('{}'::jsonb,'panel_changed','panu-panel:'||host::text,true); END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.live_panel_doorbell() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER live_panel_change_notify AFTER INSERT OR UPDATE ON public.live_panel_members FOR EACH ROW EXECUTE FUNCTION public.live_panel_doorbell();
CREATE POLICY "Members receive their own panel doorbell" ON realtime.messages FOR SELECT TO authenticated USING (realtime.topic()='panu-panel:'||auth.uid()::text);
CREATE TABLE public.coin_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.coin_orders(id),
 previous_status text, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.coin_order_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.coin_order_events TO service_role;
ALTER TABLE public.coin_order_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX coin_order_events_date ON public.coin_order_events(order_id,created_at);
CREATE OR REPLACE FUNCTION public.coin_record_order_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.coin_order_events(order_id,status) VALUES(NEW.id,NEW.status);
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.coin_order_events(order_id,previous_status,status) VALUES(NEW.id,OLD.status,NEW.status);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coin_record_order_event AFTER INSERT OR UPDATE ON public.coin_orders FOR EACH ROW EXECUTE FUNCTION public.coin_record_order_event();
CREATE TRIGGER coin_order_events_immutable BEFORE UPDATE OR DELETE ON public.coin_order_events FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
REVOKE ALL ON FUNCTION public.coin_record_order_event() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.coin_guard_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.coin_orders WHERE transaction_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Transaction Coins conservée dans le journal financier'; END IF;
  IF ROW(NEW.id,NEW.user_id,NEW.direction,NEW.channel,NEW.provider,NEW.amount,NEW.currency,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.direction,OLD.channel,OLD.provider,OLD.amount,OLD.currency,OLD.created_at) THEN RAISE EXCEPTION 'Transaction Coins immuable'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
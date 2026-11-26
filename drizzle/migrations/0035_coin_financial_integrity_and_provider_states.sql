CREATE OR REPLACE FUNCTION public.coin_guard_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.coin_orders; b numeric; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,42));
 IF NEW.kind IN ('purchase','bonus') THEN
  SELECT * INTO o FROM public.coin_orders WHERE id=NEW.order_id;
  IF NOT FOUND OR o.user_id<>NEW.user_id OR NEW.reference<>o.id::text OR NOT EXISTS(SELECT 1 FROM public.coin_receipts WHERE order_id=o.id AND provider=o.provider AND amount_minor=o.amount_minor AND currency=o.currency) THEN RAISE EXCEPTION 'Crédit sans preuve de paiement vérifiée'; END IF;
  IF (NEW.kind='purchase' AND NEW.amount<>o.coins) OR (NEW.kind='bonus' AND NEW.amount<>o.bonus) THEN RAISE EXCEPTION 'Quantité de Coins incompatible'; END IF;
 ELSIF NEW.kind='refund' THEN
  RAISE EXCEPTION 'Remboursement à rapprocher avec le prestataire avant activation';
 ELSIF NEW.kind='gift' AND NEW.amount>=0 THEN RAISE EXCEPTION 'Débit cadeau invalide'; END IF;
 SELECT coalesce(sum(amount),0) INTO b FROM public.coin_ledger WHERE user_id=NEW.user_id;
 IF b+NEW.amount<0 THEN RAISE EXCEPTION 'Solde Coins insuffisant'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coin_guard_ledger BEFORE INSERT ON public.coin_ledger FOR EACH ROW EXECUTE FUNCTION public.coin_guard_ledger();
REVOKE ALL ON FUNCTION public.coin_guard_ledger() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.coin_guard_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF ROW(NEW.id,NEW.user_id,NEW.price_id,NEW.channel_id,NEW.transaction_id,NEW.request_id,NEW.pack_name,NEW.coins,NEW.bonus,NEW.amount_minor,NEW.exponent,NEW.currency,NEW.country,NEW.provider,NEW.channel,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.price_id,OLD.channel_id,OLD.transaction_id,OLD.request_id,OLD.pack_name,OLD.coins,OLD.bonus,OLD.amount_minor,OLD.exponent,OLD.currency,OLD.country,OLD.provider,OLD.channel,OLD.created_at) THEN RAISE EXCEPTION 'Conditions de l’achat immuables'; END IF;
 IF OLD.status IN ('succeeded','failed','cancelled','refunded') AND NEW.status<>OLD.status THEN RAISE EXCEPTION 'Achat clôturé'; END IF;
 IF NEW.status='succeeded' AND NOT EXISTS(SELECT 1 FROM public.coin_receipts WHERE order_id=NEW.id AND external_reference=NEW.external_reference) THEN RAISE EXCEPTION 'Confirmation sans preuve'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coin_guard_order BEFORE UPDATE ON public.coin_orders FOR EACH ROW EXECUTE FUNCTION public.coin_guard_order();
REVOKE ALL ON FUNCTION public.coin_guard_order() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.coin_provider_state(_order uuid,_provider text,_state text,_url text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.coin_orders; BEGIN
 IF _state NOT IN ('pending','processing','failed','cancelled') THEN RAISE EXCEPTION 'Statut non autorisé'; END IF;
 IF _url IS NOT NULL AND (length(_url)>2000 OR _url !~ '^https://') THEN RAISE EXCEPTION 'Adresse de paiement invalide'; END IF;
 SELECT * INTO o FROM public.coin_orders WHERE id=_order FOR UPDATE;
 IF NOT FOUND OR o.provider<>_provider THEN RAISE EXCEPTION 'Achat incompatible'; END IF;
 IF o.status IN ('succeeded','failed','cancelled','refunded') THEN RETURN; END IF;
 IF o.status='processing' AND _state='pending' THEN RETURN; END IF;
 UPDATE public.coin_orders SET status=_state,checkout_url=coalesce(_url,checkout_url),updated_at=now() WHERE id=o.id;
 UPDATE public.transactions SET status=_state,updated_at=now() WHERE id=o.transaction_id;
END $$;
REVOKE ALL ON FUNCTION public.coin_provider_state(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coin_provider_state(uuid,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.coin_guard_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.coin_orders WHERE transaction_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Transaction Coins conservée dans le journal financier'; END IF;
  IF ROW(NEW.id,NEW.user_id,NEW.direction,NEW.channel,NEW.provider,NEW.amount,NEW.currency,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.direction,OLD.channel,OLD.provider,OLD.amount,OLD.currency,OLD.created_at) THEN RAISE EXCEPTION 'Transaction Coins immuable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coin_guard_transaction BEFORE UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.coin_guard_transaction();
REVOKE ALL ON FUNCTION public.coin_guard_transaction() FROM PUBLIC,anon,authenticated;
COMMENT ON COLUMN public.coin_orders.amount_minor IS 'Montant exact en unités mineures avec exponent. Fait autorité ; transactions.amount conserve sa précision historique à deux décimales.';
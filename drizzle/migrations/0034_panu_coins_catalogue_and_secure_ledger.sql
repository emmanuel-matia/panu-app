CREATE TABLE public.coin_packs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
 coins bigint NOT NULL CHECK (coins BETWEEN 1 AND 1000000000), bonus bigint NOT NULL DEFAULT 0 CHECK (bonus BETWEEN 0 AND 1000000000),
 popular boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.coin_packs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coin_packs TO service_role;
ALTER TABLE public.coin_packs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.coin_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pack_id uuid NOT NULL REFERENCES public.coin_packs(id), country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 1000000000000), exponent integer NOT NULL DEFAULT 2 CHECK(exponent BETWEEN 0 AND 3),
 google_product_id text CHECK(google_product_id IS NULL OR length(google_product_id) BETWEEN 1 AND 100), active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(pack_id,country,currency)
);
REVOKE ALL ON public.coin_prices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coin_prices TO service_role;
ALTER TABLE public.coin_prices ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.coin_channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL CHECK(provider ~ '^[a-z0-9_]{2,40}$'), name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 80),
 channel text NOT NULL CHECK(channel IN ('google_play','mobile_money','card','bank_transfer')),
 country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 enabled boolean NOT NULL DEFAULT false, verified_at timestamptz, verification_reference text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,channel,country,currency),
 CHECK((verified_at IS NULL AND verification_reference IS NULL) OR (verified_at IS NOT NULL AND length(btrim(verification_reference)) BETWEEN 1 AND 160))
);
REVOKE ALL ON public.coin_channels FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coin_channels TO service_role;
ALTER TABLE public.coin_channels ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.coin_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, price_id uuid NOT NULL REFERENCES public.coin_prices(id), channel_id uuid NOT NULL REFERENCES public.coin_channels(id),
 transaction_id uuid NOT NULL UNIQUE, request_id uuid NOT NULL, pack_name text NOT NULL,
 coins bigint NOT NULL CHECK(coins>0), bonus bigint NOT NULL CHECK(bonus>=0), amount_minor bigint NOT NULL CHECK(amount_minor>0), exponent integer NOT NULL CHECK(exponent BETWEEN 0 AND 3),
 currency text NOT NULL, country text NOT NULL, provider text NOT NULL, channel text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','succeeded','failed','cancelled','refunded')),
 checkout_url text, external_reference text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
REVOKE ALL ON public.coin_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.coin_orders TO service_role;
ALTER TABLE public.coin_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX coin_orders_owner_date ON public.coin_orders(user_id,created_at DESC);
CREATE TABLE public.coin_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES public.coin_orders(id), provider text NOT NULL,
 external_reference text NOT NULL CHECK(length(btrim(external_reference)) BETWEEN 1 AND 160), event_id text NOT NULL CHECK(length(btrim(event_id)) BETWEEN 1 AND 160),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL, verified_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,external_reference), UNIQUE(provider,event_id)
);
REVOKE ALL ON public.coin_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON public.coin_receipts TO service_role;
ALTER TABLE public.coin_receipts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.coin_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, amount bigint NOT NULL CHECK(amount<>0),
 kind text NOT NULL CHECK(kind IN ('purchase','bonus','gift','refund')), reference text NOT NULL CHECK(length(reference) BETWEEN 1 AND 160),
 order_id uuid REFERENCES public.coin_orders(id), recipient_id uuid, gift_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,kind,reference), CHECK((kind IN ('purchase','bonus','refund') AND order_id IS NOT NULL) OR (kind='gift' AND amount<0 AND recipient_id IS NOT NULL AND gift_id IS NOT NULL))
);
REVOKE ALL ON public.coin_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON public.coin_ledger TO service_role;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
CREATE INDEX coin_ledger_owner_date ON public.coin_ledger(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.coin_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Les traces financières sont immuables'; END $$;
CREATE TRIGGER coin_ledger_immutable BEFORE UPDATE OR DELETE ON public.coin_ledger FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
CREATE TRIGGER coin_receipts_immutable BEFORE UPDATE OR DELETE ON public.coin_receipts FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
CREATE TRIGGER coin_orders_no_delete BEFORE DELETE ON public.coin_orders FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
REVOKE ALL ON FUNCTION public.coin_immutable() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.coin_get_wallet() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN jsonb_build_object(
 'balance',(SELECT coalesce(sum(amount),0)::text FROM public.coin_ledger WHERE user_id=u),
 'orders',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,pack_name,coins::text,bonus::text,amount_minor::text,exponent,currency,country,provider,channel,status,external_reference,created_at FROM public.coin_orders WHERE user_id=u ORDER BY created_at DESC LIMIT 100) x),'[]'::jsonb),
 'ledger',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,amount::text,kind,reference,order_id,recipient_id,gift_id,created_at FROM public.coin_ledger WHERE user_id=u ORDER BY created_at DESC LIMIT 100) x),'[]'::jsonb),
 'methods',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,type,provider,label,account_identifier,currency,is_default,status FROM public.payment_methods WHERE user_id=u ORDER BY is_default DESC,created_at DESC) x),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.coin_catalogue() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN jsonb_build_object(
 'packs',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT r.id,p.id AS pack_id,p.name,p.coins::text,p.bonus::text,p.popular,r.country,r.currency,r.amount_minor::text,r.exponent,r.google_product_id FROM public.coin_prices r JOIN public.coin_packs p ON p.id=r.pack_id WHERE p.active AND r.active ORDER BY p.coins,r.country,r.currency) x),'[]'::jsonb),
 'channels',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,provider,name,channel,country,currency,enabled,(verified_at IS NOT NULL) AS verified FROM public.coin_channels ORDER BY name) x),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.coin_admin_data() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 RETURN jsonb_build_object('packs',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM public.coin_packs p),'[]'::jsonb), 'prices',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM public.coin_prices p),'[]'::jsonb),
 'channels',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,provider,name,channel,country,currency,enabled,verified_at,created_at,updated_at FROM public.coin_channels ORDER BY name) x),'[]'::jsonb),
 'orders',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,user_id,pack_name,coins::text,bonus::text,amount_minor::text,exponent,currency,country,provider,channel,status,external_reference,created_at FROM public.coin_orders ORDER BY created_at DESC LIMIT 200) x),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.coin_admin_save(_kind text,_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i uuid:=coalesce(nullif(_data->>'id','')::uuid,gen_random_uuid()); BEGIN
 IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 PERFORM public.assert_step_up();
 IF _kind='pack' THEN
 INSERT INTO public.coin_packs(id,name,coins,bonus,popular,active) VALUES(i,_data->>'name',(_data->>'coins')::bigint,(_data->>'bonus')::bigint,(_data->>'popular')::boolean,(_data->>'active')::boolean)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,coins=excluded.coins,bonus=excluded.bonus,popular=excluded.popular,active=excluded.active,updated_at=now();
 ELSIF _kind='price' THEN
 INSERT INTO public.coin_prices(id,pack_id,country,currency,amount_minor,exponent,google_product_id,active) VALUES(i,(_data->>'pack_id')::uuid,_data->>'country',_data->>'currency',(_data->>'amount_minor')::bigint,(_data->>'exponent')::integer,nullif(_data->>'google_product_id',''),(_data->>'active')::boolean)
 ON CONFLICT(id) DO UPDATE SET pack_id=excluded.pack_id,country=excluded.country,currency=excluded.currency,amount_minor=excluded.amount_minor,exponent=excluded.exponent,google_product_id=excluded.google_product_id,active=excluded.active,updated_at=now();
 ELSIF _kind='channel' THEN
 INSERT INTO public.coin_channels(id,provider,name,channel,country,currency,enabled) VALUES(i,_data->>'provider',_data->>'name',_data->>'channel',_data->>'country',_data->>'currency',(_data->>'enabled')::boolean)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,updated_at=now();
 IF EXISTS(SELECT 1 FROM public.coin_channels WHERE id=i AND (provider<>_data->>'provider' OR channel<>_data->>'channel' OR country<>_data->>'country' OR currency<>_data->>'currency')) THEN RAISE EXCEPTION 'Créez un nouveau moyen pour un autre marché ou prestataire'; END IF;
 ELSE RAISE EXCEPTION 'Configuration inconnue'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,details) VALUES(auth.uid(),'coin_config',jsonb_build_object('kind',_kind,'id',i,'data',_data - 'verification_reference'));
 RETURN i;
END $$;
CREATE OR REPLACE FUNCTION public.coin_set_default_method(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,42));
 IF NOT EXISTS(SELECT 1 FROM public.payment_methods WHERE id=_id AND user_id=u AND status='active') THEN RAISE EXCEPTION 'Compte indisponible'; END IF;
 UPDATE public.payment_methods SET is_default=false,updated_at=now() WHERE user_id=u AND is_default;
 UPDATE public.payment_methods SET is_default=true,updated_at=now() WHERE id=_id AND user_id=u;
END $$;
CREATE OR REPLACE FUNCTION public.coin_create_order(_price uuid,_channel uuid,_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); r public.coin_prices; p public.coin_packs; c public.coin_channels; o public.coin_orders; t uuid:=gen_random_uuid(); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,42));
 SELECT * INTO o FROM public.coin_orders WHERE user_id=u AND request_id=_request;
 IF FOUND THEN
 IF o.price_id<>_price OR o.channel_id<>_channel THEN RAISE EXCEPTION 'Référence réutilisée pour un autre achat'; END IF;
 RETURN to_jsonb(o); END IF;
 SELECT * INTO r FROM public.coin_prices WHERE id=_price AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Prix indisponible'; END IF;
 SELECT * INTO p FROM public.coin_packs WHERE id=r.pack_id AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pack indisponible'; END IF;
 SELECT * INTO c FROM public.coin_channels WHERE id=_channel AND enabled AND verified_at IS NOT NULL AND country=r.country AND currency=r.currency FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paiement non configuré ou non vérifié'; END IF;
 INSERT INTO public.transactions(id,user_id,direction,channel,provider,amount,currency,status) VALUES(t,u,'credit',c.channel,c.provider,round(r.amount_minor::numeric/power(10,r.exponent),2),r.currency,'pending');
 INSERT INTO public.coin_orders(user_id,price_id,channel_id,transaction_id,request_id,pack_name,coins,bonus,amount_minor,exponent,currency,country,provider,channel)
 VALUES(u,r.id,c.id,t,_request,p.name,p.coins,p.bonus,r.amount_minor,r.exponent,r.currency,r.country,c.provider,c.channel) RETURNING * INTO o;
 RETURN to_jsonb(o);
END $$;
CREATE OR REPLACE FUNCTION public.coin_settle_verified(_order uuid,_provider text,_reference text,_event text,_amount_minor bigint,_currency text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.coin_orders; r public.coin_receipts; BEGIN
 SELECT * INTO o FROM public.coin_orders WHERE id=_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Achat introuvable'; END IF;
 IF o.provider<>_provider OR o.amount_minor<>_amount_minor OR o.currency<>_currency THEN RAISE EXCEPTION 'Preuve de paiement incompatible'; END IF;
 IF o.status='succeeded' THEN
 SELECT * INTO r FROM public.coin_receipts WHERE order_id=o.id;
 IF r.provider<>_provider OR r.external_reference<>_reference THEN RAISE EXCEPTION 'Référence de paiement incompatible'; END IF;
 RETURN false; END IF;
 IF o.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Achat clôturé'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.coin_channels WHERE id=o.channel_id AND verified_at IS NOT NULL) THEN RAISE EXCEPTION 'Prestataire non vérifié'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text,42));
 INSERT INTO public.coin_receipts(order_id,provider,external_reference,event_id,amount_minor,currency) VALUES(o.id,_provider,_reference,_event,_amount_minor,_currency);
 UPDATE public.transactions SET status='succeeded',external_reference=_reference,updated_at=now() WHERE id=o.transaction_id;
 INSERT INTO public.coin_ledger(user_id,amount,kind,reference,order_id) VALUES(o.user_id,o.coins,'purchase',o.id::text,o.id);
 IF o.bonus>0 THEN INSERT INTO public.coin_ledger(user_id,amount,kind,reference,order_id) VALUES(o.user_id,o.bonus,'bonus',o.id::text,o.id); END IF;
 UPDATE public.coin_orders SET status='succeeded',external_reference=_reference,updated_at=now() WHERE id=o.id;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.coin_debit_gift(_user uuid,_recipient uuid,_gift uuid,_amount bigint,_reference text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i uuid; e public.coin_ledger; BEGIN
 IF _amount IS NULL OR _amount<=0 OR _user=_recipient OR _reference IS NULL OR length(_reference) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Dépense invalide'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user AND deactivated_at IS NULL) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_recipient AND deactivated_at IS NULL) THEN RAISE EXCEPTION 'Compte indisponible'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user::text,42));
 SELECT * INTO e FROM public.coin_ledger WHERE user_id=_user AND kind='gift' AND reference=_reference;
 IF FOUND THEN
 IF e.amount<>-_amount OR e.recipient_id<>_recipient OR e.gift_id<>_gift THEN RAISE EXCEPTION 'Référence de dépense incompatible'; END IF;
 RETURN e.id; END IF;
 IF (SELECT coalesce(sum(amount),0) FROM public.coin_ledger WHERE user_id=_user)<_amount THEN RAISE EXCEPTION 'Solde Coins insuffisant'; END IF;
 INSERT INTO public.coin_ledger(user_id,amount,kind,reference,recipient_id,gift_id) VALUES(_user,-_amount,'gift',_reference,_recipient,_gift) RETURNING id INTO i;
 RETURN i;
END $$;
REVOKE ALL ON FUNCTION public.coin_get_wallet(),public.coin_catalogue(),public.coin_admin_data(),public.coin_admin_save(text,jsonb),public.coin_set_default_method(uuid),public.coin_create_order(uuid,uuid,uuid),public.coin_settle_verified(uuid,text,text,text,bigint,text),public.coin_debit_gift(uuid,uuid,uuid,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coin_get_wallet(),public.coin_catalogue(),public.coin_admin_data(),public.coin_admin_save(text,jsonb),public.coin_set_default_method(uuid),public.coin_create_order(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coin_settle_verified(uuid,text,text,text,bigint,text),public.coin_debit_gift(uuid,uuid,uuid,bigint,text) TO service_role;
COMMENT ON TABLE public.coin_ledger IS 'Portefeuille Coins unique, séparé des crédits IA. Solde dérivé du journal. Aucune suppression. Débits cadeaux réservés à un futur service validant prix, destinataire et éligibilité.';
COMMENT ON TABLE public.coin_receipts IS 'Preuves minimales enregistrées seulement après vérification serveur indépendante du prestataire. Aucun token de paiement ou secret stocké ici.';
COMMENT ON FUNCTION public.coin_settle_verified(uuid,text,text,text,bigint,text) IS 'Service uniquement : appeler après relecture API du prestataire et vérification signature, propriétaire, commande, montant, devise et statut. Aucun endpoint public de crédit.';
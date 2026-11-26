CREATE TABLE public.coin_net_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES public.coin_orders(id), receipt_id uuid NOT NULL UNIQUE REFERENCES public.coin_receipts(id),
 provider text NOT NULL, external_reference text NOT NULL, verification_reference text NOT NULL CHECK(length(btrim(verification_reference)) BETWEEN 1 AND 160),
 gross_minor bigint NOT NULL CHECK(gross_minor>0), fee_minor bigint NOT NULL CHECK(fee_minor>=0), net_minor bigint NOT NULL CHECK(net_minor>=0), currency text NOT NULL, exponent integer NOT NULL CHECK(exponent BETWEEN 0 AND 3),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(gross_minor=fee_minor+net_minor)
);
GRANT SELECT,INSERT ON public.coin_net_verifications TO service_role;
REVOKE ALL ON public.coin_net_verifications FROM PUBLIC,anon,authenticated;
ALTER TABLE public.coin_net_verifications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER coin_net_verifications_immutable BEFORE UPDATE OR DELETE ON public.coin_net_verifications FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
CREATE TABLE public.gift_sends (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL, recipient_id uuid NOT NULL, gift_id uuid NOT NULL REFERENCES public.gift_catalogue(id), request_id uuid NOT NULL,
 target_kind text NOT NULL CHECK(target_kind IN ('profile','post','live')), target_id uuid NOT NULL, message text NOT NULL DEFAULT '' CHECK(length(message)<=250),
 gift_name text NOT NULL, image_path text NOT NULL, animation text NOT NULL, animation_path text,
 sender_username text NOT NULL, sender_name text NOT NULL, sender_avatar_path text, recipient_username text NOT NULL, recipient_name text NOT NULL, recipient_avatar_path text,
 coins_spent bigint NOT NULL CHECK(coins_spent>0), creator_percent numeric(5,2) NOT NULL CHECK(creator_percent BETWEEN 0 AND 100), panu_percent numeric(5,2) NOT NULL CHECK(panu_percent BETWEEN 0 AND 100),
 status text NOT NULL DEFAULT 'sent' CHECK(status='sent'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(sender_id,request_id), CHECK(sender_id<>recipient_id), CHECK(creator_percent+panu_percent=100)
);
GRANT SELECT,INSERT ON public.gift_sends TO service_role;
REVOKE ALL ON public.gift_sends FROM PUBLIC,anon,authenticated;
ALTER TABLE public.gift_sends ENABLE ROW LEVEL SECURITY;
CREATE INDEX gift_sends_sender_date ON public.gift_sends(sender_id,created_at DESC,id);
CREATE INDEX gift_sends_recipient_date ON public.gift_sends(recipient_id,created_at DESC,id);
CREATE INDEX gift_sends_target_date ON public.gift_sends(target_kind,target_id,created_at DESC);
CREATE TRIGGER gift_sends_immutable BEFORE UPDATE OR DELETE ON public.gift_sends FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
CREATE TABLE public.gift_earnings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), send_id uuid NOT NULL REFERENCES public.gift_sends(id), order_id uuid NOT NULL REFERENCES public.coin_orders(id), net_verification_id uuid NOT NULL REFERENCES public.coin_net_verifications(id),
 recipient_id uuid NOT NULL, coins_allocated bigint NOT NULL CHECK(coins_allocated>0), currency text NOT NULL, exponent integer NOT NULL CHECK(exponent BETWEEN 0 AND 3),
 net_minor bigint NOT NULL CHECK(net_minor>=0), creator_minor bigint NOT NULL CHECK(creator_minor>=0), panu_minor bigint NOT NULL CHECK(panu_minor>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status='pending'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(send_id,order_id), CHECK(net_minor=creator_minor+panu_minor)
);
GRANT SELECT,INSERT ON public.gift_earnings TO service_role;
REVOKE ALL ON public.gift_earnings FROM PUBLIC,anon,authenticated;
ALTER TABLE public.gift_earnings ENABLE ROW LEVEL SECURITY;
CREATE INDEX gift_earnings_order ON public.gift_earnings(order_id);
CREATE INDEX gift_earnings_recipient ON public.gift_earnings(recipient_id,created_at DESC);
CREATE TRIGGER gift_earnings_immutable BEFORE UPDATE OR DELETE ON public.gift_earnings FOR EACH ROW EXECUTE FUNCTION public.coin_immutable();
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK(type IN ('like','comment','follow','referral','gift'));
ALTER TABLE public.notifications ADD COLUMN gift_send_id uuid REFERENCES public.gift_sends(id);
CREATE UNIQUE INDEX notifications_gift_send_unique ON public.notifications(gift_send_id) WHERE gift_send_id IS NOT NULL;
CREATE FUNCTION public.coin_record_net_verification(_order uuid,_provider text,_reference text,_fee_minor bigint,_net_minor bigint,_verification text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.coin_orders; r public.coin_receipts; v public.coin_net_verifications; i uuid;
BEGIN
 SELECT * INTO o FROM public.coin_orders WHERE id=_order FOR UPDATE;
 IF NOT FOUND OR o.status<>'succeeded' THEN RAISE EXCEPTION 'Achat non confirmé'; END IF;
 SELECT * INTO r FROM public.coin_receipts WHERE order_id=o.id;
 IF NOT FOUND OR r.provider IS DISTINCT FROM _provider OR r.external_reference IS DISTINCT FROM _reference OR r.amount_minor<>o.amount_minor OR r.currency<>o.currency THEN RAISE EXCEPTION 'Preuve incompatible'; END IF;
 IF _fee_minor IS NULL OR _net_minor IS NULL OR _fee_minor<0 OR _net_minor<0 OR _fee_minor::numeric+_net_minor::numeric<>r.amount_minor THEN RAISE EXCEPTION 'Net encaissé et frais incompatibles'; END IF;
 SELECT * INTO v FROM public.coin_net_verifications WHERE order_id=o.id;
 IF FOUND THEN
  IF v.fee_minor<>_fee_minor OR v.net_minor<>_net_minor OR v.verification_reference IS DISTINCT FROM _verification THEN RAISE EXCEPTION 'Preuve nette déjà enregistrée'; END IF;
  RETURN v.id;
 END IF;
 INSERT INTO public.coin_net_verifications(order_id,receipt_id,provider,external_reference,verification_reference,gross_minor,fee_minor,net_minor,currency,exponent)
 VALUES(o.id,r.id,_provider,_reference,_verification,o.amount_minor,_fee_minor,_net_minor,o.currency,o.exponent) RETURNING id INTO i;
 RETURN i;
END $$;
CREATE FUNCTION public.gift_resolve_recipient(_kind text,_target uuid) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); r uuid; p public.profiles; po public.posts;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND deactivated_at IS NULL) THEN RAISE EXCEPTION 'Compte indisponible'; END IF;
 IF _kind='profile' THEN r:=_target;
 ELSIF _kind='post' THEN
  SELECT * INTO po FROM public.posts WHERE id=_target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publication indisponible'; END IF;
  r:=po.author_id;
 ELSIF _kind='live' THEN
  SELECT host_id INTO r FROM public.get_live_public(_target) WHERE status='live';
  IF NOT FOUND THEN RAISE EXCEPTION 'Direct indisponible ou non actif'; END IF;
 ELSE RAISE EXCEPTION 'Destination invalide'; END IF;
 IF r=u THEN RAISE EXCEPTION 'Vous ne pouvez pas vous envoyer un cadeau'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=r AND deactivated_at IS NULL;
 IF NOT FOUND OR public.is_blocked_between(u,r) THEN RAISE EXCEPTION 'Destinataire indisponible'; END IF;
 IF NOT coalesce(public.can_view_post(r,CASE WHEN _kind='post' THEN po.visibility ELSE 'public' END,p.is_locked,p.deactivated_at),false) THEN RAISE EXCEPTION 'Accès au destinataire refusé'; END IF;
 RETURN r;
END $$;
CREATE FUNCTION public.gift_find_recipient(_username text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles; r uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 SELECT * INTO p FROM public.profiles WHERE username=lower(ltrim(btrim(_username),'@'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Destinataire introuvable'; END IF;
 r:=public.gift_resolve_recipient('profile',p.id);
 RETURN jsonb_build_object('id',r,'username',p.username,'displayName',p.display_name,'avatarPath',p.avatar_url);
END $$;
CREATE FUNCTION public.gift_quote(_gift uuid,_kind text,_target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.gift_catalogue; p public.profiles; b numeric; r uuid;
BEGIN
 r:=public.gift_resolve_recipient(_kind,_target);
 SELECT * INTO g FROM public.gift_catalogue WHERE id=_gift AND active AND available;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cadeau indisponible'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=r;
 SELECT coalesce(sum(amount),0) INTO b FROM public.coin_ledger WHERE user_id=auth.uid();
 RETURN jsonb_build_object('giftId',g.id,'giftName',g.name,'price',g.price_coins::text,'balance',b::text,'remaining',CASE WHEN b>=g.price_coins THEN (b-g.price_coins)::text ELSE NULL END,'recipientId',r,'recipientName',p.display_name,'recipientUsername',p.username);
END $$;
CREATE FUNCTION public.gift_send(_gift uuid,_kind text,_target uuid,_expected_price bigint,_request uuid,_message text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); r uuid; g public.gift_catalogue; existing public.gift_sends; s public.profiles; p public.profiles; cfg public.gift_revenue_config;
 i uuid:=gen_random_uuid(); msg text:=btrim(coalesce(_message,'')); bal numeric; need bigint; lot record; used bigint; take bigint; net bigint; creator bigint; total_coins bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _request IS NULL OR length(msg)>250 THEN RAISE EXCEPTION 'Demande invalide'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,42));
 SELECT * INTO existing FROM public.gift_sends WHERE sender_id=u AND request_id=_request;
 IF FOUND THEN
  IF existing.gift_id IS DISTINCT FROM _gift OR existing.target_kind IS DISTINCT FROM _kind OR existing.target_id IS DISTINCT FROM _target OR existing.coins_spent IS DISTINCT FROM _expected_price OR existing.message<>msg THEN RAISE EXCEPTION 'Référence réutilisée pour un autre envoi'; END IF;
  SELECT coalesce(sum(amount),0) INTO bal FROM public.coin_ledger WHERE user_id=u;
  RETURN jsonb_build_object('id',existing.id,'duplicate',true,'balance',bal::text);
 END IF;
 r:=public.gift_resolve_recipient(_kind,_target);
 SELECT * INTO s FROM public.profiles WHERE id=u AND deactivated_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Compte indisponible'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=r AND deactivated_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Destinataire indisponible'; END IF;
 SELECT * INTO g FROM public.gift_catalogue WHERE id=_gift AND active AND available FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cadeau indisponible'; END IF;
 IF _expected_price IS DISTINCT FROM g.price_coins THEN RAISE EXCEPTION 'Le prix a changé. Vérifiez et confirmez à nouveau'; END IF;
 IF (SELECT count(*) FROM public.gift_sends WHERE sender_id=u AND created_at>now()-interval '1 minute')>=20 THEN RAISE EXCEPTION 'Trop d’envois. Réessayez dans une minute'; END IF;
 SELECT coalesce(sum(amount),0) INTO bal FROM public.coin_ledger WHERE user_id=u;
 IF bal<g.price_coins THEN RAISE EXCEPTION 'Solde Coins insuffisant'; END IF;
 IF (SELECT coalesce(sum(-amount),0) FROM public.coin_ledger WHERE user_id=u AND kind='gift')<>(SELECT coalesce(sum(coins_spent),0) FROM public.gift_sends WHERE sender_id=u) THEN RAISE EXCEPTION 'Historique Coins à rapprocher avant envoi'; END IF;
 SELECT * INTO cfg FROM public.gift_revenue_config WHERE singleton FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Répartition des revenus indisponible'; END IF;
 INSERT INTO public.gift_sends(id,sender_id,recipient_id,gift_id,request_id,target_kind,target_id,message,gift_name,image_path,animation,animation_path,sender_username,sender_name,sender_avatar_path,recipient_username,recipient_name,recipient_avatar_path,coins_spent,creator_percent,panu_percent)
 VALUES(i,u,r,g.id,_request,_kind,_target,msg,g.name,g.image_path,g.animation,g.animation_path,s.username,s.display_name,s.avatar_url,p.username,p.display_name,p.avatar_url,g.price_coins,cfg.creator_percent,cfg.panu_percent);
 need:=g.price_coins;
 FOR lot IN SELECT o.*,v.id AS net_id,v.net_minor FROM public.coin_orders o LEFT JOIN public.coin_net_verifications v ON v.order_id=o.id WHERE o.user_id=u AND o.status='succeeded' ORDER BY o.created_at,o.id LOOP
  total_coins:=lot.coins+lot.bonus;
  IF NOT EXISTS(SELECT 1 FROM public.coin_receipts WHERE order_id=lot.id) OR (SELECT coalesce(sum(amount),0) FROM public.coin_ledger WHERE order_id=lot.id AND kind IN ('purchase','bonus'))<>total_coins THEN RAISE EXCEPTION 'Provenance Coins non vérifiée'; END IF;
  SELECT coalesce(sum(coins_allocated),0) INTO used FROM public.gift_earnings WHERE order_id=lot.id;
  IF used>total_coins THEN RAISE EXCEPTION 'Provenance Coins incohérente'; END IF;
  IF used=total_coins THEN CONTINUE; END IF;
  IF lot.net_id IS NULL THEN RAISE EXCEPTION 'Frais et montant net du paiement non vérifiés. Aucun Coin débité'; END IF;
  take:=least(need,total_coins-used);
  net:=floor(lot.net_minor::numeric*(used+take)/total_coins)-floor(lot.net_minor::numeric*used/total_coins);
  creator:=floor(net::numeric*cfg.creator_percent/100);
  INSERT INTO public.gift_earnings(send_id,order_id,net_verification_id,recipient_id,coins_allocated,currency,exponent,net_minor,creator_minor,panu_minor) VALUES(i,lot.id,lot.net_id,r,take,lot.currency,lot.exponent,net,creator,net-creator);
  need:=need-take;
  EXIT WHEN need=0;
 END LOOP;
 IF need<>0 THEN RAISE EXCEPTION 'Provenance Coins insuffisante. Aucun Coin débité'; END IF;
 PERFORM public.coin_debit_gift(u,r,g.id,g.price_coins,i::text);
 IF coalesce((SELECT (prefs->>'notify_gifts')::boolean FROM public.user_settings WHERE user_id=r),true) THEN
  INSERT INTO public.notifications(user_id,actor_id,type,gift_send_id) VALUES(r,u,'gift',i);
 END IF;
 RETURN jsonb_build_object('id',i,'duplicate',false,'balance',(bal-g.price_coins)::text);
END $$;
CREATE FUNCTION public.gift_history(_direction text DEFAULT 'received',_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF _direction NOT IN ('sent','received','admin') OR _offset<0 OR _offset>1000000 THEN RAISE EXCEPTION 'Historique invalide'; END IF;
 IF _direction='admin' AND NOT coalesce(public.is_founder(auth.uid()),false) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT s.id,s.sender_id,s.recipient_id,s.sender_username,s.sender_name,s.sender_avatar_path,s.recipient_username,s.recipient_name,s.recipient_avatar_path,s.gift_name,s.image_path,s.animation,s.animation_path,s.coins_spent::text,s.message,s.target_kind,s.target_id,s.status,s.created_at,s.creator_percent,s.panu_percent,
 coalesce((SELECT jsonb_agg(jsonb_build_object('currency',e.currency,'exponent',e.exponent,'net_minor',e.net_minor::text,'creator_minor',e.creator_minor::text,'panu_minor',e.panu_minor::text,'status',e.status)) FROM public.gift_earnings e WHERE e.send_id=s.id),'[]'::jsonb) AS earnings,
 (SELECT n.id FROM public.notifications n WHERE n.gift_send_id=s.id AND n.user_id=auth.uid()) AS notification_id
 FROM public.gift_sends s WHERE (_direction='admin' OR (_direction='sent' AND s.sender_id=auth.uid()) OR (_direction='received' AND s.recipient_id=auth.uid())) ORDER BY s.created_at DESC,s.id DESC LIMIT 30 OFFSET _offset) x),'[]'::jsonb);
END $$;
CREATE FUNCTION public.gift_revenue_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN jsonb_build_object('received',(SELECT count(*) FROM public.gift_sends WHERE recipient_id=auth.uid()),'sent',(SELECT count(*) FROM public.gift_sends WHERE sender_id=auth.uid()),'currencies',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT currency,exponent,sum(creator_minor)::text AS pending_minor FROM public.gift_earnings WHERE recipient_id=auth.uid() GROUP BY currency,exponent ORDER BY currency) x),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.coin_record_net_verification(uuid,text,text,bigint,bigint,text),public.gift_resolve_recipient(text,uuid),public.gift_find_recipient(text),public.gift_quote(uuid,text,uuid),public.gift_send(uuid,text,uuid,bigint,uuid,text),public.gift_history(text,integer),public.gift_revenue_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coin_record_net_verification(uuid,text,text,bigint,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gift_find_recipient(text),public.gift_quote(uuid,text,uuid),public.gift_send(uuid,text,uuid,bigint,uuid,text),public.gift_history(text,integer),public.gift_revenue_summary() TO authenticated;
COMMENT ON TABLE public.coin_net_verifications IS 'Frais et net encaissé relus indépendamment auprès du prestataire ; service-only, aucun endpoint navigateur ou preuve client. Aucun taux uniforme Coins/argent.';
COMMENT ON TABLE public.gift_earnings IS 'Registre unique des revenus cadeaux manquant auparavant. Allocation FIFO sur achats prouvés, bonus répartis au prorata du lot, arrondis cumulés en unités mineures ; revenus en attente, jamais retirables avant règles et prestataire de versement validés.';
COMMENT ON TABLE public.gift_sends IS 'Opérations cadeaux immuables, reliées au débit coin_ledger via reference=id. Référence idempotente par expéditeur, aucune suppression de traces.';
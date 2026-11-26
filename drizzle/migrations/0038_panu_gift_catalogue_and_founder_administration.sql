CREATE TABLE public.gift_catalogue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 80), description text NOT NULL DEFAULT '' CHECK(length(description)<=500),
 image_path text NOT NULL CHECK(length(image_path) BETWEEN 1 AND 400 AND (image_path LIKE '/__l5e/assets-v1/%' OR image_path ~ '^[a-f0-9-]{36}/gift-[a-f0-9-]{36}\.(webp|png|jpg|gif)$')),
 animation text NOT NULL DEFAULT 'none' CHECK(animation IN ('none','pulse','float','sparkle')),
 animation_path text CHECK(animation_path IS NULL OR animation_path ~ '^[a-f0-9-]{36}/gift-[a-f0-9-]{36}\.gif$'),
 price_coins bigint NOT NULL CHECK(price_coins BETWEEN 1 AND 1000000000), category text NOT NULL CHECK(length(btrim(category)) BETWEEN 1 AND 40),
 active boolean NOT NULL DEFAULT false, available boolean NOT NULL DEFAULT true, popular boolean NOT NULL DEFAULT false,
 position integer NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 1000000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gift_catalogue TO service_role;
REVOKE ALL ON public.gift_catalogue FROM PUBLIC,anon,authenticated;
ALTER TABLE public.gift_catalogue ENABLE ROW LEVEL SECURITY;
CREATE INDEX gift_catalogue_display ON public.gift_catalogue(active,position);
CREATE TABLE public.gift_revenue_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), creator_percent numeric(5,2) NOT NULL DEFAULT 50 CHECK(creator_percent BETWEEN 0 AND 100),
 panu_percent numeric(5,2) NOT NULL DEFAULT 50 CHECK(panu_percent BETWEEN 0 AND 100), calculation_basis text NOT NULL DEFAULT 'net_verified_after_provider_fees' CHECK(calculation_basis='net_verified_after_provider_fees'),
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
 CHECK(creator_percent+panu_percent=100)
);
GRANT ALL ON public.gift_revenue_config TO service_role;
REVOKE ALL ON public.gift_revenue_config FROM PUBLIC,anon,authenticated;
ALTER TABLE public.gift_revenue_config ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.gift_catalogue_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.position,g.created_at) FROM (SELECT id,slug,name,description,image_path,animation,animation_path,price_coins::text,category,active,available,popular,position,created_at,updated_at FROM public.gift_catalogue WHERE active) g),'[]'::jsonb);
END $$;
CREATE FUNCTION public.gift_admin_data() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(public.is_founder(auth.uid()),false) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 RETURN jsonb_build_object('gifts',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.position,g.created_at) FROM (SELECT id,slug,name,description,image_path,animation,animation_path,price_coins::text,category,active,available,popular,position,created_at,updated_at FROM public.gift_catalogue) g),'[]'::jsonb), 'config',coalesce((SELECT to_jsonb(c) FROM public.gift_revenue_config c),jsonb_build_object('creator_percent',50,'panu_percent',50,'calculation_basis','net_verified_after_provider_fees')));
END $$;
CREATE FUNCTION public.gift_admin_save(_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i uuid:=coalesce(nullif(_data->>'id','')::uuid,gen_random_uuid()); old_slug text; image text:=_data->>'image_path'; animation_file text:=nullif(_data->>'animation_path','');
BEGIN
 IF NOT coalesce(public.is_founder(auth.uid()),false) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 PERFORM public.assert_step_up();
 IF NOT (image LIKE '/__l5e/assets-v1/%' OR image LIKE auth.uid()::text||'/gift-%') OR (animation_file IS NOT NULL AND animation_file NOT LIKE auth.uid()::text||'/gift-%') THEN RAISE EXCEPTION 'Visuel non autorisé'; END IF;
 SELECT slug INTO old_slug FROM public.gift_catalogue WHERE id=i FOR UPDATE;
 IF FOUND AND old_slug<>_data->>'slug' THEN RAISE EXCEPTION 'Identifiant du cadeau immuable'; END IF;
 INSERT INTO public.gift_catalogue(id,slug,name,description,image_path,animation,animation_path,price_coins,category,active,available,popular,position)
 VALUES(i,_data->>'slug',btrim(_data->>'name'),coalesce(_data->>'description',''),image,_data->>'animation',animation_file,(_data->>'price_coins')::bigint,btrim(_data->>'category'),(_data->>'active')::boolean,(_data->>'available')::boolean,(_data->>'popular')::boolean,(_data->>'position')::integer)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,image_path=excluded.image_path,animation=excluded.animation,animation_path=excluded.animation_path,price_coins=excluded.price_coins,category=excluded.category,active=excluded.active,available=excluded.available,popular=excluded.popular,position=excluded.position,updated_at=now();
 INSERT INTO public.admin_audit_log(actor_id,action,details) VALUES(auth.uid(),'gift_catalogue_config',jsonb_build_object('id',i,'data',_data));
 RETURN i;
END $$;
CREATE FUNCTION public.gift_admin_revenue_config(_creator_percent numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(public.is_founder(auth.uid()),false) THEN RAISE EXCEPTION 'Accès financier réservé'; END IF;
 PERFORM public.assert_step_up();
 IF _creator_percent IS NULL OR _creator_percent<0 OR _creator_percent>100 OR round(_creator_percent,2)<>_creator_percent THEN RAISE EXCEPTION 'Pourcentage invalide'; END IF;
 INSERT INTO public.gift_revenue_config(singleton,creator_percent,panu_percent,updated_by) VALUES(true,_creator_percent,100-_creator_percent,auth.uid()) ON CONFLICT(singleton) DO UPDATE SET creator_percent=excluded.creator_percent,panu_percent=excluded.panu_percent,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.admin_audit_log(actor_id,action,details) VALUES(auth.uid(),'gift_revenue_config',jsonb_build_object('creator_percent',_creator_percent,'panu_percent',100-_creator_percent,'basis','net_verified_after_provider_fees'));
END $$;
REVOKE ALL ON FUNCTION public.gift_catalogue_list(),public.gift_admin_data(),public.gift_admin_save(jsonb),public.gift_admin_revenue_config(numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gift_catalogue_list(),public.gift_admin_data(),public.gift_admin_save(jsonb),public.gift_admin_revenue_config(numeric) TO authenticated;
COMMENT ON TABLE public.gift_catalogue IS 'Catalogue PANU réel ; désactivation sans suppression. Aucun envoi ou revenu simulé. Débit et opérations cadeaux seront reliés au portefeuille Coins unique.';
COMMENT ON TABLE public.gift_revenue_config IS 'Partage configurable du net réellement encaissé après frais. Ne définit aucun taux de conversion Coins/argent, aucune disponibilité ni éligibilité aux retraits.';
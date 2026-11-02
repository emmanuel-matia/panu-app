-- SÉCURITÉ BIOMÉTRIQUE : passkeys (WebAuthn), consentement, confirmation renforcée (step-up).
-- Aucune donnée existante n'est modifiée. Aucune empreinte ni image de visage n'est stockée :
-- seule la clé PUBLIQUE de la passkey est conservée ; la vérification biométrique reste sur le téléphone.
-- Retour arrière :
--   CREATE OR REPLACE admin_set_admin / admin_set_plan sans la ligne PERFORM public.assert_step_up();
--   DROP FUNCTION public.assert_step_up(), public.record_biometric_consent(TEXT, TEXT), public.withdraw_biometric_data(TEXT);
--   DROP TABLE public.step_up_events, public.webauthn_challenges, public.passkey_credentials, public.biometric_consents;

CREATE TABLE public.passkey_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_label TEXT NOT NULL DEFAULT 'Appareil' CHECK (char_length(device_label) BETWEEN 1 AND 60),
  backed_up BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX passkey_credentials_user_idx ON public.passkey_credentials (user_id);
-- Le propriétaire voit ses appareils, jamais la clé publique ni le compteur.
GRANT SELECT (id, user_id, device_label, transports, backed_up, created_at, last_used_at) ON public.passkey_credentials TO authenticated;
GRANT DELETE ON public.passkey_credentials TO authenticated;
GRANT ALL ON public.passkey_credentials TO service_role;
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own passkeys" ON public.passkey_credentials FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner deletes own passkeys" ON public.passkey_credentials FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Défis à usage unique (serveur uniquement : aucune politique = aucun accès direct).
CREATE TABLE public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login', 'step_up')),
  challenge TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes'
);
CREATE INDEX webauthn_challenges_ip_idx ON public.webauthn_challenges (ip_hash, created_at);
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.webauthn_challenges IS 'Serveur uniquement (service_role) : volontairement sans politique.';

-- Preuves de confirmation renforcée (écrites uniquement par le serveur après vérification).
CREATE TABLE public.step_up_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('passkey', 'password')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX step_up_events_user_idx ON public.step_up_events (user_id, verified_at DESC);
GRANT ALL ON public.step_up_events TO service_role;
ALTER TABLE public.step_up_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.step_up_events IS 'Serveur uniquement (service_role) : volontairement sans politique.';

-- Consentement biométrique explicite (preuve datée par le serveur).
CREATE TABLE public.biometric_consents (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('passkey', 'selfie')),
  version TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, kind)
);
GRANT SELECT ON public.biometric_consents TO authenticated;
GRANT ALL ON public.biometric_consents TO service_role;
ALTER TABLE public.biometric_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own biometric consent" ON public.biometric_consents FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_biometric_consent(_kind TEXT, _version TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _kind <> 'passkey' THEN RAISE EXCEPTION 'Méthode non disponible'; END IF;
  IF _version IS NULL OR char_length(_version) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Version invalide'; END IF;
  INSERT INTO public.biometric_consents (user_id, kind, version, granted_at, withdrawn_at)
  VALUES (auth.uid(), _kind, _version, now(), NULL)
  ON CONFLICT (user_id, kind) DO UPDATE SET version = EXCLUDED.version, granted_at = now(), withdrawn_at = NULL;
END $$;

-- Retire le consentement ET supprime les passkeys enregistrées (droit à l'effacement).
CREATE OR REPLACE FUNCTION public.withdraw_biometric_data(_kind TEXT) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _kind <> 'passkey' THEN RAISE EXCEPTION 'Méthode non disponible'; END IF;
  DELETE FROM public.passkey_credentials WHERE user_id = auth.uid();
  GET DIAGNOSTICS _n = ROW_COUNT;
  DELETE FROM public.step_up_events WHERE user_id = auth.uid();
  UPDATE public.biometric_consents SET withdrawn_at = now() WHERE user_id = auth.uid() AND kind = _kind;
  RETURN _n;
END $$;

-- Confirmation renforcée exigée pour les actions sensibles du fondateur.
-- Si le compte a une passkey, la confirmation doit venir de la passkey ; sinon le mot de passe (solution de secours).
CREATE OR REPLACE FUNCTION public.assert_step_up() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _has_pk BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.passkey_credentials WHERE user_id = auth.uid()) INTO _has_pk;
  IF NOT EXISTS (
    SELECT 1 FROM public.step_up_events e
    WHERE e.user_id = auth.uid() AND e.verified_at > now() - interval '10 minutes'
      AND (NOT _has_pk OR e.method = 'passkey')
  ) THEN
    RAISE EXCEPTION 'Confirmation de sécurité requise';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_admin(_target UUID, _grant BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  PERFORM public.assert_step_up();
  IF public.is_founder(_target) THEN RAISE EXCEPTION 'Le compte du fondateur ne peut pas être modifié ici'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _target) THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = 'admin';
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), CASE WHEN _grant THEN 'admin_granted' ELSE 'admin_revoked' END, _target, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_plan(_target UUID, _plan TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old TEXT;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  PERFORM public.assert_step_up();
  IF _plan NOT IN ('free','premium','pro') THEN RAISE EXCEPTION 'Offre invalide'; END IF;
  SELECT plan INTO _old FROM public.user_credits WHERE user_id = _target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cet utilisateur n''a pas encore de compte de crédits (il ne s''est pas connecté depuis la mise en place)'; END IF;
  UPDATE public.user_credits SET plan = _plan, updated_at = now() WHERE user_id = _target;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), 'plan_changed', _target, jsonb_build_object('from', _old, 'to', _plan));
END $$;

-- Droits d'exécution : moindre privilège (aucun accès anonyme).
REVOKE ALL ON FUNCTION public.record_biometric_consent(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_biometric_data(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_step_up() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_biometric_consent(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_biometric_data(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_step_up() TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_admin(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_plan(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(UUID, TEXT) TO authenticated, service_role;
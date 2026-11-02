CREATE TABLE public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  documents text[] NOT NULL,
  version text NOT NULL,
  source text NOT NULL,
  user_agent text,
  checked_at timestamptz,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_consents TO authenticated;
GRANT ALL ON public.legal_consents TO service_role;

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own consents"
  ON public.legal_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX legal_consents_user_idx ON public.legal_consents (user_id, accepted_at DESC);
CREATE UNIQUE INDEX legal_consents_user_version_idx ON public.legal_consents (user_id, version);

COMMENT ON TABLE public.legal_consents IS 'Preuve du consentement aux documents juridiques : version acceptée, date serveur, source, appareil. Écriture uniquement via record_legal_consent.';

-- Enregistre l'acceptation de la version courante. La date de preuve est l'heure du serveur.
CREATE OR REPLACE FUNCTION public.record_legal_consent(
  _version text,
  _source text,
  _documents text[],
  _user_agent text DEFAULT NULL,
  _checked_at timestamptz DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _existing timestamptz;
  _checked timestamptz := _checked_at;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  IF _version IS NULL OR length(_version) = 0 OR length(_version) > 80 THEN
    RAISE EXCEPTION 'Version invalide';
  END IF;
  IF _source NOT IN ('inscription', 'google', 'acceptation') THEN
    RAISE EXCEPTION 'Source invalide';
  END IF;
  IF _documents IS NULL OR array_length(_documents, 1) IS NULL
     OR NOT (_documents <@ ARRAY['cgu', 'confidentialite']::text[])
     OR NOT (ARRAY['cgu', 'confidentialite']::text[] <@ _documents) THEN
    RAISE EXCEPTION 'Les CGU et la politique de confidentialité doivent être acceptées ensemble';
  END IF;
  -- L'heure de la case cochée vient de l'appareil : gardée seulement si plausible.
  IF _checked IS NOT NULL AND (_checked > now() + interval '5 minutes' OR _checked < now() - interval '30 days') THEN
    _checked := NULL;
  END IF;

  SELECT accepted_at INTO _existing FROM public.legal_consents WHERE user_id = _uid AND version = _version;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.legal_consents (user_id, documents, version, source, user_agent, checked_at)
  VALUES (_uid, _documents, _version, _source, left(_user_agent, 300), _checked)
  RETURNING accepted_at INTO _existing;
  RETURN _existing;
END;
$$;

REVOKE ALL ON FUNCTION public.record_legal_consent(text, text, text[], text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_legal_consent(text, text, text[], text, timestamptz) TO authenticated;
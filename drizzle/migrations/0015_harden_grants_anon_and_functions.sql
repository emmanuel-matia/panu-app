-- DURCISSEMENT DES DROITS (réversible, aucune donnée ni table touchée).
-- Retour arrière : GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--                  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC, anon, authenticated;

-- 1. Les visiteurs non connectés n'ont aucun accès direct aux tables
--    (le contenu public passe uniquement par des fonctions contrôlées).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 2. Les utilisateurs connectés n'ont pas besoin de vider une table, ni de créer des déclencheurs.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 3. Fonctions sensibles : plus d'exécution par défaut pour tout le monde.
DO $$
DECLARE
  f record;
  v_auth boolean;
  public_whitelist text[] := ARRAY['get_public_profile','list_posts','list_comments','list_video_posts','username_taken'];
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, p.prorettype = 'trigger'::regtype AS is_trigger,
           format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND (p.prosecdef OR p.prorettype = 'trigger'::regtype)
  LOOP
    v_auth := has_function_privilege('authenticated', f.oid, 'execute');
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    IF NOT f.is_trigger THEN
      IF v_auth THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
      END IF;
      IF f.proname = ANY (public_whitelist) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig);
      END IF;
    END IF;
  END LOOP;
END $$;
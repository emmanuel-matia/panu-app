-- ===== Profils : informations complémentaires et confidentialité =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website TEXT CHECK (website IS NULL OR char_length(website) <= 200),
  ADD COLUMN IF NOT EXISTS city TEXT CHECK (city IS NULL OR char_length(city) <= 60),
  ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IS NULL OR char_length(country) <= 60),
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(social_links) = 'object' AND pg_column_size(social_links) < 4000),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_policy TEXT NOT NULL DEFAULT 'everyone'
    CHECK (follow_policy IN ('everyone', 'nobody')),
  ADD COLUMN IF NOT EXISTS searchable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_online BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Préférences détaillées (contenu, accessibilité, multimédia, audience…)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS prefs JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(prefs) = 'object' AND pg_column_size(prefs) < 16000);

-- Visibilité et commentaires par publication
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT true;

-- ===== Compte officiel du fondateur (une seule ligne) =====
CREATE TABLE public.platform_founder (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  designated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_founder TO service_role;
ALTER TABLE public.platform_founder ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.founder_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.platform_founder LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.founder_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_id() TO anon, authenticated, service_role;

-- ===== Blocage =====
CREATE TABLE public.blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocks_blocked_idx ON public.blocks (blocked_id);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses blocages" ON public.blocks
  FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Un utilisateur bloque en son nom" ON public.blocks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Un utilisateur débloque en son nom" ON public.blocks
  FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  )
$$;
REVOKE ALL ON FUNCTION public.is_blocked_between(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(UUID, UUID) TO authenticated, service_role;

-- Un blocage supprime les abonnements dans les deux sens
CREATE OR REPLACE FUNCTION public.after_block()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.after_block() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER blocks_remove_follows AFTER INSERT ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.after_block();

-- Abonnement refusé en cas de blocage ou si le compte n'accepte pas d'abonnés
CREATE OR REPLACE FUNCTION public.check_follow_allowed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_blocked_between(NEW.follower_id, NEW.following_id) THEN
    RAISE EXCEPTION 'Abonnement impossible avec ce compte';
  END IF;
  IF NEW.following_id IS DISTINCT FROM public.founder_id() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.following_id AND (follow_policy = 'nobody' OR deactivated_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Ce compte n''accepte pas de nouveaux abonnés';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_follow_allowed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER follows_check_allowed BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.check_follow_allowed();

-- Abonnement automatique au fondateur, une seule fois, à la création du profil
CREATE OR REPLACE FUNCTION public.auto_follow_founder()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _f UUID := public.founder_id();
BEGIN
  IF _f IS NOT NULL AND _f <> NEW.id THEN
    INSERT INTO public.follows (follower_id, following_id) VALUES (NEW.id, _f)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.auto_follow_founder() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_auto_follow_founder AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_follow_founder();

-- Les commentaires respectent le réglage de la publication et les blocages
CREATE OR REPLACE FUNCTION public.check_comment_allowed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID; _allow BOOLEAN;
BEGIN
  SELECT author_id, allow_comments INTO _owner, _allow FROM public.posts WHERE id = NEW.post_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Publication introuvable'; END IF;
  IF NEW.author_id <> _owner THEN
    IF NOT _allow THEN RAISE EXCEPTION 'Les commentaires sont désactivés sur cette publication'; END IF;
    IF public.is_blocked_between(NEW.author_id, _owner) THEN RAISE EXCEPTION 'Action impossible avec ce compte'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_comment_allowed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER post_comments_allowed BEFORE INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_comment_allowed();

-- ===== Parrainage =====
CREATE TABLE public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  shares_count INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit son code de parrainage" ON public.referral_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.referrals (
  referred_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referred_id <> referrer_id)
);
CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parrain et filleul voient le parrainage" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _code TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  FOR i IN 1..10 LOOP
    _code := upper(substr(md5(random()::text || clock_timestamp()::text || _uid::text), 1, 8));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
      IF _code IS NOT NULL THEN RETURN _code; END IF;
    END;
  END LOOP;
  RAISE EXCEPTION 'Impossible de créer le code, réessayez';
END $$;
REVOKE ALL ON FUNCTION public.my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;

-- Enregistre le parrainage d'un nouveau compte (une seule fois, compte récent, parrain plus ancien)
CREATE OR REPLACE FUNCTION public.redeem_referral(_code TEXT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _me_created TIMESTAMPTZ; _referrer UUID; _ref_created TIMESTAMPTZ; _clean TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  _clean := upper(btrim(coalesce(_code, '')));
  SELECT created_at INTO _me_created FROM public.profiles WHERE id = _uid;
  IF _me_created IS NULL THEN RETURN 'profil_absent'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _uid) THEN RETURN 'deja'; END IF;
  IF _me_created < now() - interval '7 days' THEN RETURN 'trop_tard'; END IF;
  SELECT rc.user_id, p.created_at INTO _referrer, _ref_created
  FROM public.referral_codes rc JOIN public.profiles p ON p.id = rc.user_id
  WHERE rc.code = _clean;
  IF _referrer IS NULL THEN RETURN 'invalide'; END IF;
  IF _referrer = _uid THEN RETURN 'soi_meme'; END IF;
  IF _ref_created >= _me_created THEN RETURN 'invalide'; END IF;
  INSERT INTO public.referrals (referred_id, referrer_id, code) VALUES (_uid, _referrer, _clean)
  ON CONFLICT DO NOTHING;
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.redeem_referral(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_invite_share()
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.referral_codes SET shares_count = shares_count + 1 WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.record_invite_share() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invite_share() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_referrals()
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, r.created_at
  FROM public.referrals r JOIN public.profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_referrals() TO authenticated;

-- ===== Numéro de téléphone (privé) et recherche de contacts =====
CREATE TABLE public.phone_lookup (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL CHECK (phone ~ '^\+?[0-9]{6,15}$'),
  phone_hash TEXT NOT NULL,
  discoverable BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phone_lookup_hash_idx ON public.phone_lookup (phone_hash);
GRANT SELECT ON public.phone_lookup TO authenticated;
GRANT ALL ON public.phone_lookup TO service_role;
ALTER TABLE public.phone_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit son numéro" ON public.phone_lookup
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Clé de correspondance : empreinte des 9 derniers chiffres (indépendante de l'indicatif saisi)
CREATE OR REPLACE FUNCTION public.phone_key(_raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN length(d) >= 8 THEN encode(sha256(convert_to(right(d, 9), 'UTF8')), 'hex') END
  FROM (SELECT regexp_replace(coalesce(_raw, ''), '\D', '', 'g') AS d) s
$$;

CREATE OR REPLACE FUNCTION public.set_my_phone(_phone TEXT, _discoverable BOOLEAN)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _clean TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  _clean := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');
  IF _clean !~ '^\+?[0-9]{8,15}$' THEN RAISE EXCEPTION 'Numéro de téléphone invalide'; END IF;
  INSERT INTO public.phone_lookup (user_id, phone, phone_hash, discoverable, updated_at)
  VALUES (_uid, _clean, public.phone_key(_clean), coalesce(_discoverable, false), now())
  ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone, phone_hash = EXCLUDED.phone_hash,
    discoverable = EXCLUDED.discoverable, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.set_my_phone(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_phone(TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_phone_discoverable(_discoverable BOOLEAN)
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.phone_lookup SET discoverable = coalesce(_discoverable, false), updated_at = now()
  WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.set_phone_discoverable(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_phone_discoverable(BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_my_phone()
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.phone_lookup WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.clear_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_phone() TO authenticated;

-- Correspondance des contacts : ne renvoie jamais de numéro, seulement les comptes qui l'acceptent
CREATE OR REPLACE FUNCTION public.match_contacts(_numbers TEXT[])
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, i_follow BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF coalesce(array_length(_numbers, 1), 0) > 1000 THEN RAISE EXCEPTION 'Trop de contacts (1000 maximum)'; END IF;
  RETURN QUERY
  SELECT DISTINCT p.id, p.username, p.display_name, p.avatar_url,
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id)
  FROM public.phone_lookup l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.discoverable
    AND l.phone_hash IN (SELECT public.phone_key(n) FROM unnest(_numbers) AS n)
    AND p.id <> auth.uid()
    AND p.deactivated_at IS NULL
    AND NOT public.is_blocked_between(p.id, auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.match_contacts(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_contacts(TEXT[]) TO authenticated;

-- ===== Personnes : recherche, suggestions, abonnés, blocages =====
CREATE OR REPLACE FUNCTION public.search_profiles(_q TEXT)
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, is_founder BOOLEAN, i_follow BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.id = public.founder_id(),
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id)
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND char_length(btrim(_q)) >= 2
    AND p.searchable AND p.deactivated_at IS NULL AND p.id <> auth.uid()
    AND NOT public.is_blocked_between(p.id, auth.uid())
    AND (p.username ILIKE '%' || replace(replace(btrim(ltrim(_q, '@')), '%', ''), '_', '\_') || '%'
      OR p.display_name ILIKE '%' || replace(replace(btrim(_q), '%', ''), '_', '\_') || '%')
  ORDER BY (lower(p.username) = lower(btrim(ltrim(_q, '@')))) DESC, p.created_at
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.search_profiles(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT) TO authenticated;

-- Suggestions réelles : personnes qui vous suivent, puis comptes suivis par vos abonnements
CREATE OR REPLACE FUNCTION public.suggested_profiles()
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, reason TEXT, mutual_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  mine AS (SELECT following_id FROM public.follows, me WHERE follower_id = me.uid),
  candidates AS (
    SELECT f.follower_id AS pid, 'vous_suit'::text AS reason, 0::bigint AS mutual, 1 AS prio
    FROM public.follows f, me WHERE f.following_id = me.uid
    UNION ALL
    SELECT f2.following_id, 'amis_communs', count(*), 2
    FROM public.follows f2 WHERE f2.follower_id IN (SELECT following_id FROM mine)
    GROUP BY f2.following_id
  ),
  ranked AS (
    SELECT DISTINCT ON (c.pid) c.pid, c.reason, c.mutual, c.prio FROM candidates c
    ORDER BY c.pid, c.prio, c.mutual DESC
  )
  SELECT p.id, p.username, p.display_name, p.avatar_url, r.reason, r.mutual
  FROM ranked r JOIN public.profiles p ON p.id = r.pid, me
  WHERE me.uid IS NOT NULL AND p.id <> me.uid
    AND p.id NOT IN (SELECT following_id FROM mine)
    AND p.deactivated_at IS NULL AND p.searchable AND p.follow_policy = 'everyone'
    AND NOT public.is_blocked_between(p.id, me.uid)
  ORDER BY r.prio, r.mutual DESC
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.suggested_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggested_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_follow_users(_kind TEXT)
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, followed_at TIMESTAMPTZ, i_follow BOOLEAN, is_founder BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, f.created_at,
    EXISTS (SELECT 1 FROM public.follows x WHERE x.follower_id = auth.uid() AND x.following_id = p.id),
    p.id = public.founder_id()
  FROM public.follows f
  JOIN public.profiles p ON p.id = CASE WHEN _kind = 'followers' THEN f.follower_id ELSE f.following_id END
  WHERE auth.uid() IS NOT NULL
    AND ((_kind = 'followers' AND f.following_id = auth.uid())
      OR (_kind = 'following' AND f.follower_id = auth.uid()))
  ORDER BY f.created_at DESC
  LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.list_follow_users(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_follow_users(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_blocked_users()
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, avatar_url TEXT, blocked_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, b.created_at
  FROM public.blocks b JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.list_blocked_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_blocked_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.viewer_relation(_profile_id UUID)
RETURNS TABLE(blocked_by_me BOOLEAN, blocked_me BOOLEAN, follows_me BOOLEAN, i_follow BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = auth.uid() AND blocked_id = _profile_id),
    EXISTS (SELECT 1 FROM public.blocks WHERE blocker_id = _profile_id AND blocked_id = auth.uid()),
    EXISTS (SELECT 1 FROM public.follows WHERE follower_id = _profile_id AND following_id = auth.uid()),
    EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = _profile_id)
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.viewer_relation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.viewer_relation(UUID) TO authenticated;

-- ===== Notifications in-app =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'referral')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Un utilisateur supprime ses notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.push_notification(_user UUID, _actor UUID, _type TEXT, _post UUID)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok BOOLEAN;
BEGIN
  IF _user IS NULL OR _user = _actor THEN RETURN; END IF;
  IF _actor IS NOT NULL AND public.is_blocked_between(_user, _actor) THEN RETURN; END IF;
  SELECT CASE _type
      WHEN 'like' THEN s.notify_likes
      WHEN 'comment' THEN s.notify_comments
      WHEN 'follow' THEN s.notify_follows
      ELSE coalesce((s.prefs->>'notify_invitations')::boolean, true) END
    INTO _ok FROM public.user_settings s WHERE s.user_id = _user;
  IF coalesce(_ok, true) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id) VALUES (_user, _actor, _type, _post);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.push_notification(UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.push_notification((SELECT author_id FROM public.posts WHERE id = NEW.post_id), NEW.user_id, 'like', NEW.post_id);
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.push_notification((SELECT author_id FROM public.posts WHERE id = NEW.post_id), NEW.author_id, 'comment', NEW.post_id);
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.push_notification(NEW.following_id, NEW.follower_id, 'follow', NULL);
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.notify_on_referral()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.push_notification(NEW.referrer_id, NEW.referred_id, 'referral', NULL);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_referral() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER post_likes_notify AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
CREATE TRIGGER post_comments_notify AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
CREATE TRIGGER follows_notify AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
CREATE TRIGGER referrals_notify AFTER INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.notify_on_referral();

CREATE OR REPLACE FUNCTION public.list_notifications()
RETURNS TABLE(id UUID, type TEXT, created_at TIMESTAMPTZ, read_at TIMESTAMPTZ, post_id UUID, post_title TEXT,
  actor_id UUID, actor_username TEXT, actor_display_name TEXT, actor_avatar_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.type, n.created_at, n.read_at, n.post_id, po.title,
    a.id, a.username, a.display_name, a.avatar_url
  FROM public.notifications n
  LEFT JOIN public.profiles a ON a.id = n.actor_id
  LEFT JOIN public.posts po ON po.id = n.post_id
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.list_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION public.unread_notifications_count()
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.notifications WHERE user_id = auth.uid() AND read_at IS NULL
$$;
REVOKE ALL ON FUNCTION public.unread_notifications_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unread_notifications_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;

-- ===== Temps passé sur PANU =====
CREATE TABLE public.usage_daily (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0 CHECK (seconds BETWEEN 0 AND 86400),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.usage_daily TO authenticated;
GRANT ALL ON public.usage_daily TO service_role;
ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit son temps d'utilisation" ON public.usage_daily
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_usage_seconds(_seconds INTEGER, _day DATE)
RETURNS INTEGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _total INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _seconds IS NULL OR _seconds < 1 OR _seconds > 120 THEN RAISE EXCEPTION 'Durée invalide'; END IF;
  IF _day IS NULL OR abs(_day - current_date) > 1 THEN RAISE EXCEPTION 'Jour invalide'; END IF;
  INSERT INTO public.usage_daily (user_id, day, seconds) VALUES (_uid, _day, _seconds)
  ON CONFLICT (user_id, day) DO UPDATE SET seconds = least(86400, public.usage_daily.seconds + EXCLUDED.seconds)
  RETURNING seconds INTO _total;
  RETURN _total;
END $$;
REVOKE ALL ON FUNCTION public.add_usage_seconds(INTEGER, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_usage_seconds(INTEGER, DATE) TO authenticated;

-- ===== Tableau de bord créateur (données réelles du compte connecté) =====
CREATE OR REPLACE FUNCTION public.creator_stats(_from TIMESTAMPTZ, _to TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _r JSONB;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _from IS NULL OR _to IS NULL OR _to <= _from OR _to - _from > interval '400 days' THEN
    RAISE EXCEPTION 'Période invalide';
  END IF;
  WITH my_posts AS (SELECT id, title, kind, created_at FROM public.posts WHERE author_id = _uid),
  v AS (
    SELECT pv.post_id, pv.viewer_id, pv.created_at FROM public.post_views pv
    JOIN my_posts mp ON mp.id = pv.post_id WHERE pv.created_at >= _from AND pv.created_at < _to
  ),
  l AS (
    SELECT x.post_id, x.created_at FROM public.post_likes x
    JOIN my_posts mp ON mp.id = x.post_id WHERE x.created_at >= _from AND x.created_at < _to
  ),
  c AS (
    SELECT x.post_id, x.created_at FROM public.post_comments x
    JOIN my_posts mp ON mp.id = x.post_id WHERE x.created_at >= _from AND x.created_at < _to
  ),
  sh AS (
    SELECT x.post_id FROM public.post_shares x
    JOIN my_posts mp ON mp.id = x.post_id WHERE x.created_at >= _from AND x.created_at < _to
  ),
  sv AS (
    SELECT x.post_id FROM public.post_saves x
    JOIN my_posts mp ON mp.id = x.post_id WHERE x.created_at >= _from AND x.created_at < _to
  ),
  fl AS (SELECT created_at FROM public.follows WHERE following_id = _uid AND created_at >= _from AND created_at < _to),
  st AS (SELECT id FROM public.stories WHERE author_id = _uid AND created_at >= _from AND created_at < _to),
  stv AS (
    SELECT x.story_id FROM public.story_views x JOIN public.stories s ON s.id = x.story_id
    WHERE s.author_id = _uid AND x.viewed_at >= _from AND x.viewed_at < _to
  )
  SELECT jsonb_build_object(
    'views', (SELECT count(*) FROM v),
    'reach', (SELECT count(DISTINCT viewer_id) FROM v),
    'video_views', (SELECT count(*) FROM v JOIN my_posts mp ON mp.id = v.post_id WHERE mp.kind = 'video'),
    'likes', (SELECT count(*) FROM l),
    'comments', (SELECT count(*) FROM c),
    'shares', (SELECT count(*) FROM sh),
    'saves', (SELECT count(*) FROM sv),
    'followers_total', (SELECT count(*) FROM public.follows WHERE following_id = _uid),
    'followers_gained', (SELECT count(*) FROM fl),
    'posts_total', (SELECT count(*) FROM my_posts),
    'posts_in_period', (SELECT count(*) FROM my_posts WHERE created_at >= _from AND created_at < _to),
    'stories_count', (SELECT count(*) FROM st),
    'story_views', (SELECT count(*) FROM stv),
    'top_posts', (
      SELECT coalesce(jsonb_agg(t ORDER BY t.views DESC, t.likes DESC), '[]'::jsonb) FROM (
        SELECT mp.id, mp.title, mp.kind,
          (SELECT count(*) FROM v WHERE v.post_id = mp.id) AS views,
          (SELECT count(*) FROM l WHERE l.post_id = mp.id) AS likes,
          (SELECT count(*) FROM c WHERE c.post_id = mp.id) AS comments,
          (SELECT count(*) FROM sh WHERE sh.post_id = mp.id) AS shares
        FROM my_posts mp
        ORDER BY views DESC, likes DESC, mp.created_at DESC
        LIMIT 5
      ) t WHERE t.views > 0 OR t.likes > 0 OR t.comments > 0 OR t.shares > 0
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'views', (SELECT count(*) FROM v WHERE v.created_at >= d AND v.created_at < d + interval '1 day'),
        'followers', (SELECT count(*) FROM fl WHERE fl.created_at >= d AND fl.created_at < d + interval '1 day'),
        'likes', (SELECT count(*) FROM l WHERE l.created_at >= d AND l.created_at < d + interval '1 day')
      ) ORDER BY d), '[]'::jsonb)
      FROM generate_series(date_trunc('day', _from), _to - interval '1 second', interval '1 day') AS d
    )
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.creator_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ===== Lectures publiques : visibilité, verrouillage, désactivation et blocages =====
CREATE OR REPLACE FUNCTION public.can_view_post(_author UUID, _visibility TEXT, _locked BOOLEAN, _deactivated TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _author = auth.uid() OR (
    _deactivated IS NULL
    AND NOT public.is_blocked_between(_author, auth.uid())
    AND (
      (_visibility = 'public' AND NOT _locked)
      OR (_visibility IN ('public', 'followers') AND EXISTS (
        SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = _author))
    )
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_post(UUID, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_post(UUID, TEXT, BOOLEAN, TIMESTAMPTZ) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_posts(_mode text DEFAULT 'recent'::text, _author_id uuid DEFAULT NULL::uuid, _post_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_id uuid, kind text, title text, caption text, media_path text, cover_path text, media_duration real, category text, trim_start real, trim_end real, volume real, overlay_text text, source text, allow_remix boolean, remix_of uuid, remix_of_username text, remix_of_title text, created_at timestamp with time zone, author_username text, author_display_name text, author_avatar_url text, author_location text, likes_count bigint, comments_count bigint, shares_count bigint, views_count bigint, saves_count bigint, liked_by_me boolean, saved_by_me boolean, score double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT po.*, pr.username AS a_username, pr.display_name AS a_display_name, pr.avatar_url AS a_avatar,
      pr.location AS a_location,
      (SELECT count(*) FROM public.post_likes l WHERE l.post_id = po.id) AS n_likes,
      (SELECT count(*) FROM public.post_comments c WHERE c.post_id = po.id) AS n_comments,
      (SELECT count(*) FROM public.post_shares s WHERE s.post_id = po.id) AS n_shares,
      (SELECT count(*) FROM public.post_views v WHERE v.post_id = po.id) AS n_views,
      (SELECT count(*) FROM public.post_saves sv WHERE sv.post_id = po.id) AS n_saves
    FROM public.posts po JOIN public.profiles pr ON pr.id = po.author_id
    WHERE (_author_id IS NULL OR po.author_id = _author_id)
      AND (_post_id IS NULL OR po.id = _post_id)
      AND (_mode <> 'following' OR po.author_id IN (
        SELECT f.following_id FROM public.follows f WHERE f.follower_id = auth.uid()))
      AND (_mode <> 'trending' OR po.created_at > now() - interval '30 days')
      AND public.can_view_post(po.author_id, po.visibility, pr.is_locked, pr.deactivated_at)
  ), scored AS (
    SELECT b.*,
      (b.n_views + 3 * b.n_likes + 4 * b.n_comments + 5 * b.n_shares + 2 * b.n_saves)::double precision
        / power(extract(epoch FROM (now() - b.created_at)) / 3600.0 + 2.0, 1.5) AS s
    FROM base b
  )
  SELECT sc.id, sc.author_id, sc.kind, sc.title, sc.caption, sc.video_path, sc.cover_path,
    sc.media_duration, sc.category, sc.trim_start, sc.trim_end, sc.volume, sc.overlay_text,
    sc.source, sc.allow_remix, sc.remix_of, op.username, orig.title,
    sc.created_at, sc.a_username, sc.a_display_name, sc.a_avatar, sc.a_location,
    sc.n_likes, sc.n_comments, sc.n_shares, sc.n_views, sc.n_saves,
    EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = sc.id AND l.user_id = auth.uid()),
    EXISTS (SELECT 1 FROM public.post_saves sv WHERE sv.post_id = sc.id AND sv.user_id = auth.uid()),
    sc.s
  FROM scored sc
  LEFT JOIN public.posts orig ON orig.id = sc.remix_of
  LEFT JOIN public.profiles op ON op.id = orig.author_id
  ORDER BY CASE WHEN _mode = 'trending' THEN sc.s ELSE 0 END DESC, sc.created_at DESC
  LIMIT 30
$function$;

CREATE OR REPLACE FUNCTION public.list_video_posts(_author_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_id uuid, title text, caption text, video_path text, trim_start real, trim_end real, volume real, overlay_text text, source text, created_at timestamp with time zone, author_username text, author_display_name text, author_avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT po.id, po.author_id, po.title, po.caption, po.video_path,
    po.trim_start, po.trim_end, po.volume, po.overlay_text, po.source, po.created_at,
    pr.username, pr.display_name, pr.avatar_url
  FROM public.posts po
  JOIN public.profiles pr ON pr.id = po.author_id
  WHERE po.kind = 'video' AND (_author_id IS NULL OR po.author_id = _author_id)
    AND public.can_view_post(po.author_id, po.visibility, pr.is_locked, pr.deactivated_at)
  ORDER BY po.created_at DESC
  LIMIT 30
$function$;

DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, cover_url text, bio text,
  created_at timestamptz, followers_count bigint, following_count bigint, posts_count bigint,
  website text, city text, country text, social_links jsonb, is_professional boolean,
  is_locked boolean, is_founder boolean, follow_policy text, online boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.cover_url, p.bio, p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id),
    (SELECT count(*) FROM public.posts po WHERE po.author_id = p.id AND po.visibility = 'public'),
    CASE WHEN coalesce((s.prefs->>'show_website')::boolean, true) THEN p.website END,
    CASE WHEN coalesce((s.prefs->>'show_location')::boolean, true) THEN p.city END,
    CASE WHEN coalesce((s.prefs->>'show_location')::boolean, true) THEN p.country END,
    CASE WHEN coalesce((s.prefs->>'show_social')::boolean, true) THEN p.social_links ELSE '{}'::jsonb END,
    p.is_professional, p.is_locked, p.id = public.founder_id(), p.follow_policy,
    CASE WHEN p.show_online THEN coalesce(p.last_seen_at > now() - interval '5 minutes', false) END
  FROM public.profiles p
  LEFT JOIN public.user_settings s ON s.user_id = p.id
  WHERE lower(p.username) = lower(_username) AND p.deactivated_at IS NULL
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;
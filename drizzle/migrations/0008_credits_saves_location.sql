-- Localisation facultative du créateur
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT
  CHECK (location IS NULL OR char_length(location) <= 60);

-- ===== Crédits et offre (Free / Premium / Pro) =====
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro')),
  welcome_granted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses crédits" ON public.user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) <= 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX credit_transactions_user_idx ON public.credit_transactions (user_id, created_at DESC);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses mouvements de crédits" ON public.credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Crédits de bienvenue : attribués une seule fois par compte
CREATE OR REPLACE FUNCTION public.claim_welcome_credits()
RETURNS INTEGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _welcome CONSTANT INTEGER := 60;
  _balance INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN RETURN 0; END IF;
  INSERT INTO public.user_credits (user_id, balance, welcome_granted_at)
  VALUES (_uid, _welcome, now())
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, amount, reason) VALUES (_uid, _welcome, 'bienvenue');
  END IF;
  SELECT balance INTO _balance FROM public.user_credits WHERE user_id = _uid;
  RETURN _balance;
END $$;
REVOKE ALL ON FUNCTION public.claim_welcome_credits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_welcome_credits() TO authenticated;

-- Dépense de crédits par l'utilisateur connecté (jamais en négatif)
CREATE OR REPLACE FUNCTION public.spend_credits(_amount INTEGER, _reason TEXT)
RETURNS INTEGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _balance INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 100 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  UPDATE public.user_credits SET balance = balance - _amount, updated_at = now()
  WHERE user_id = _uid AND balance >= _amount
  RETURNING balance INTO _balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crédits insuffisants'; END IF;
  INSERT INTO public.credit_transactions (user_id, amount, reason) VALUES (_uid, -_amount, left(coalesce(_reason, 'ia'), 40));
  RETURN _balance;
END $$;
REVOKE ALL ON FUNCTION public.spend_credits(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_credits(INTEGER, TEXT) TO authenticated;

-- Remboursement après un échec de génération : réservé au serveur
CREATE OR REPLACE FUNCTION public.refund_credits(_user_id UUID, _amount INTEGER, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _amount IS NULL OR _amount < 1 OR _amount > 100 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  UPDATE public.user_credits SET balance = balance + _amount, updated_at = now() WHERE user_id = _user_id;
  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, amount, reason) VALUES (_user_id, _amount, left(coalesce(_reason, 'remboursement'), 40));
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT) TO service_role;

-- ===== Publications enregistrées =====
CREATE TABLE public.post_saves (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses enregistrements" ON public.post_saves
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Un utilisateur enregistre en son nom" ON public.post_saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Un utilisateur retire ses enregistrements" ON public.post_saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== Fil : localisation de l'auteur, enregistrements et compteur d'enregistrements =====
DROP FUNCTION IF EXISTS public.list_posts(TEXT, UUID, UUID);
CREATE FUNCTION public.list_posts(_mode TEXT DEFAULT 'recent', _author_id UUID DEFAULT NULL, _post_id UUID DEFAULT NULL)
RETURNS TABLE(id uuid, author_id uuid, kind text, title text, caption text, media_path text, cover_path text,
  media_duration real, category text, trim_start real, trim_end real, volume real, overlay_text text,
  source text, allow_remix boolean, remix_of uuid, remix_of_username text, remix_of_title text,
  created_at timestamptz, author_username text, author_display_name text, author_avatar_url text,
  author_location text, likes_count bigint, comments_count bigint, shares_count bigint, views_count bigint,
  saves_count bigint, liked_by_me boolean, saved_by_me boolean, score double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
$$;
REVOKE ALL ON FUNCTION public.list_posts(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_posts(TEXT, UUID, UUID) TO anon, authenticated, service_role;

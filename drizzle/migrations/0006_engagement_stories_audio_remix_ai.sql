-- ===== Rôles (modération) =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses rôles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== Publications : images, audio, remix =====
ALTER TABLE public.posts
  ADD COLUMN cover_path TEXT,
  ADD COLUMN media_duration REAL,
  ADD COLUMN category TEXT CHECK (category IS NULL OR char_length(category) <= 30),
  ADD COLUMN remix_of UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN allow_remix BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.posts DROP CONSTRAINT posts_kind_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_kind_check CHECK (kind IN ('video', 'image', 'audio'));
CREATE INDEX posts_remix_of_idx ON public.posts (remix_of);

CREATE OR REPLACE FUNCTION public.is_post_owner(_post_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.posts WHERE id = _post_id AND author_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.validate_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cover_path IS NOT NULL AND split_part(NEW.cover_path, '/', 1) <> NEW.author_id::text THEN
    RAISE EXCEPTION 'Couverture invalide';
  END IF;
  IF NEW.remix_of IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.remix_of IS DISTINCT FROM OLD.remix_of) THEN
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = NEW.remix_of AND allow_remix) THEN
      RAISE EXCEPTION 'Le créateur original n''autorise pas les remix de cette publication';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER posts_validate BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_post();

-- ===== J'aime =====
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses J'aime" ON public.post_likes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Un utilisateur aime en son nom" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Un utilisateur retire son J'aime" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== Commentaires (avec réponses) =====
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture des commentaires par auteur, propriétaire ou modération" ON public.post_comments
  FOR SELECT TO authenticated USING (
    auth.uid() = author_id OR public.is_post_owner(post_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Un utilisateur commente en son nom" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Suppression par auteur, propriétaire du contenu ou modération" ON public.post_comments
  FOR DELETE TO authenticated USING (
    auth.uid() = author_id OR public.is_post_owner(post_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.validate_comment_parent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.post_comments WHERE id = NEW.parent_id AND post_id = NEW.post_id
  ) THEN
    RAISE EXCEPTION 'Réponse invalide';
  END IF;
  NEW.body := btrim(NEW.body);
  RETURN NEW;
END $$;
CREATE TRIGGER post_comments_validate BEFORE INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_comment_parent();

-- ===== Vues et partages (écriture via fonctions uniquement) =====
CREATE TABLE public.post_views (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, viewer_id)
);
GRANT ALL ON public.post_views TO service_role;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX post_shares_post_idx ON public.post_shares (post_id);
GRANT ALL ON public.post_shares TO service_role;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_post_view(_post_id UUID)
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.post_views (post_id, viewer_id)
  SELECT _post_id, auth.uid()
  WHERE auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.posts WHERE id = _post_id)
  ON CONFLICT DO NOTHING
$$;

CREATE OR REPLACE FUNCTION public.record_post_share(_post_id UUID, _channel TEXT)
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.post_shares (post_id, user_id, channel)
  SELECT _post_id, auth.uid(), left(coalesce(_channel, 'lien'), 20)
  WHERE EXISTS (SELECT 1 FROM public.posts WHERE id = _post_id)
$$;

-- ===== Stories (24 h) =====
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  overlay_text TEXT CHECK (overlay_text IS NULL OR char_length(overlay_text) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX stories_author_expires_idx ON public.stories (author_id, expires_at);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses stories" ON public.stories
  FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Un utilisateur publie ses stories" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_id AND split_part(media_path, '/', 1) = auth.uid()::text);
CREATE POLICY "Un utilisateur supprime ses stories" ON public.stories
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.set_story_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  NEW.expires_at := now() + interval '24 hours';
  RETURN NEW;
END $$;
CREATE TRIGGER stories_set_expiry BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_story_expiry();

CREATE TABLE public.story_views (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_story_view(_story_id UUID)
RETURNS VOID LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.story_views (story_id, viewer_id)
  SELECT s.id, auth.uid() FROM public.stories s
  WHERE s.id = _story_id AND s.expires_at > now() AND auth.uid() IS NOT NULL
    AND s.author_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = s.author_id)
  ON CONFLICT DO NOTHING
$$;

CREATE OR REPLACE FUNCTION public.list_active_stories()
RETURNS TABLE (
  id UUID, author_id UUID, author_username TEXT, author_display_name TEXT, author_avatar_url TEXT,
  media_path TEXT, media_type TEXT, overlay_text TEXT, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  seen BOOLEAN, views_count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.author_id, p.username, p.display_name, p.avatar_url,
    s.media_path, s.media_type, s.overlay_text, s.created_at, s.expires_at,
    EXISTS (SELECT 1 FROM public.story_views v WHERE v.story_id = s.id AND v.viewer_id = auth.uid()),
    CASE WHEN s.author_id = auth.uid()
      THEN (SELECT count(*) FROM public.story_views v WHERE v.story_id = s.id) END
  FROM public.stories s JOIN public.profiles p ON p.id = s.author_id
  WHERE s.expires_at > now() AND auth.uid() IS NOT NULL AND (
    s.author_id = auth.uid()
    OR s.author_id IN (SELECT following_id FROM public.follows WHERE follower_id = auth.uid()))
  ORDER BY (s.author_id = auth.uid()) DESC, s.author_id, s.created_at
$$;

CREATE OR REPLACE FUNCTION public.list_story_viewers(_story_id UUID)
RETURNS TABLE (viewer_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, viewed_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, v.viewed_at
  FROM public.story_views v
  JOIN public.stories s ON s.id = v.story_id
  JOIN public.profiles p ON p.id = v.viewer_id
  WHERE v.story_id = _story_id AND s.author_id = auth.uid()
  ORDER BY v.viewed_at DESC
$$;

-- ===== Créations du Studio IA =====
CREATE TABLE public.ai_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'music', 'voice', 'text')),
  prompt TEXT NOT NULL,
  media_path TEXT,
  mime_type TEXT,
  text_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_creations_user_idx ON public.ai_creations (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.ai_creations TO authenticated;
GRANT ALL ON public.ai_creations TO service_role;
ALTER TABLE public.ai_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur voit ses créations IA" ON public.ai_creations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Un utilisateur enregistre ses créations IA" ON public.ai_creations
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (media_path IS NULL OR split_part(media_path, '/', 1) = auth.uid()::text));
CREATE POLICY "Un utilisateur supprime ses créations IA" ON public.ai_creations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== Lecture publique des publications =====
CREATE OR REPLACE FUNCTION public.list_posts(
  _mode TEXT DEFAULT 'recent', _author_id UUID DEFAULT NULL, _post_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID, author_id UUID, kind TEXT, title TEXT, caption TEXT, media_path TEXT, cover_path TEXT,
  media_duration REAL, category TEXT, trim_start REAL, trim_end REAL, volume REAL, overlay_text TEXT,
  source TEXT, allow_remix BOOLEAN, remix_of UUID, remix_of_username TEXT, remix_of_title TEXT,
  created_at TIMESTAMPTZ, author_username TEXT, author_display_name TEXT, author_avatar_url TEXT,
  likes_count BIGINT, comments_count BIGINT, shares_count BIGINT, views_count BIGINT,
  liked_by_me BOOLEAN, score DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT po.*, pr.username AS a_username, pr.display_name AS a_display_name, pr.avatar_url AS a_avatar,
      (SELECT count(*) FROM public.post_likes l WHERE l.post_id = po.id) AS n_likes,
      (SELECT count(*) FROM public.post_comments c WHERE c.post_id = po.id) AS n_comments,
      (SELECT count(*) FROM public.post_shares s WHERE s.post_id = po.id) AS n_shares,
      (SELECT count(*) FROM public.post_views v WHERE v.post_id = po.id) AS n_views
    FROM public.posts po JOIN public.profiles pr ON pr.id = po.author_id
    WHERE (_author_id IS NULL OR po.author_id = _author_id)
      AND (_post_id IS NULL OR po.id = _post_id)
      AND (_mode <> 'following' OR po.author_id IN (
        SELECT f.following_id FROM public.follows f WHERE f.follower_id = auth.uid()))
      AND (_mode <> 'trending' OR po.created_at > now() - interval '30 days')
  ), scored AS (
    SELECT b.*,
      (b.n_views + 3 * b.n_likes + 4 * b.n_comments + 5 * b.n_shares)::double precision
        / power(extract(epoch FROM (now() - b.created_at)) / 3600.0 + 2.0, 1.5) AS s
    FROM base b
  )
  SELECT sc.id, sc.author_id, sc.kind, sc.title, sc.caption, sc.video_path, sc.cover_path,
    sc.media_duration, sc.category, sc.trim_start, sc.trim_end, sc.volume, sc.overlay_text,
    sc.source, sc.allow_remix, sc.remix_of, op.username, orig.title,
    sc.created_at, sc.a_username, sc.a_display_name, sc.a_avatar,
    sc.n_likes, sc.n_comments, sc.n_shares, sc.n_views,
    EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = sc.id AND l.user_id = auth.uid()),
    sc.s
  FROM scored sc
  LEFT JOIN public.posts orig ON orig.id = sc.remix_of
  LEFT JOIN public.profiles op ON op.id = orig.author_id
  ORDER BY CASE WHEN _mode = 'trending' THEN sc.s ELSE 0 END DESC, sc.created_at DESC
  LIMIT 30
$$;

CREATE OR REPLACE FUNCTION public.list_comments(_post_id UUID)
RETURNS TABLE (
  id UUID, parent_id UUID, body TEXT, created_at TIMESTAMPTZ, author_id UUID,
  author_username TEXT, author_display_name TEXT, author_avatar_url TEXT, can_delete BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.parent_id, c.body, c.created_at, c.author_id, p.username, p.display_name, p.avatar_url,
    (auth.uid() IS NOT NULL AND (c.author_id = auth.uid() OR public.is_post_owner(c.post_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')))
  FROM public.post_comments c JOIN public.profiles p ON p.id = c.author_id
  WHERE c.post_id = _post_id
  ORDER BY c.created_at
  LIMIT 300
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_post_owner(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_post_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_post_share(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_story_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_active_stories() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_story_viewers(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_posts(TEXT, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_comments(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_post_owner(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_post_view(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_post_share(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_story_view(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_active_stories() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_story_viewers(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_posts(TEXT, UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_comments(UUID) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_post() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_comment_parent() FROM PUBLIC;
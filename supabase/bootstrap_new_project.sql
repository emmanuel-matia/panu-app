-- ============================================================
-- PANU — Initialisation complète d'un projet Supabase NEUF
-- ------------------------------------------------------------
-- Projet cible : neimyzkkyjrieipvtrme (état vérifié : vide)
-- Généré depuis le dépôt (source de vérité), dans l'ordre exact.
--
-- Contenu, dans cet ordre :
--   1. Migration de base plateforme  : profiles + RLS
--   2. 0000 avatars (contraintes profil + policies)
--   3. 0001 follows
--   4. 0002 posts + video_jobs
--   5. 0003 lectures publiques via fonctions (RPC)
--   6. 0004 vidéos : lecture propriétaire
--   7. 0005 avatars : lecture propriétaire
--   8. 0006 engagement, stories, audio, remix, IA
--   9. 0007 édition de profil + index de performance
--  10. 0008 buckets Storage `avatars` + `videos` et politiques canoniques
--
-- Comment l'appliquer (le dépôt n'a AUCUN accès DDL) :
--   Supabase → SQL Editor → New query → coller tout ce fichier → Run.
--
-- Sécurité : aucune table supprimée, aucune donnée supprimée.
-- Tout est exécuté dans une seule transaction : en cas d'erreur,
-- la base reste dans son état initial.
-- ============================================================

BEGIN;

-- ============================================================
-- SOURCE : supabase/migrations/20260903094349_95f9435c-b663-4d16-8e4f-806de7f4844a.sql
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profils visibles publiquement"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Un utilisateur crée son propre profil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Un utilisateur modifie son propre profil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- SOURCE : drizzle/migrations/0000_avatars_storage_policies.sql
-- ============================================================
CREATE POLICY "Avatars lisibles par tous"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Un utilisateur envoie son propre avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Un utilisateur remplace son propre avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Un utilisateur supprime son propre avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 300),
  ADD CONSTRAINT profiles_display_name_length CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 50);
-- ============================================================
-- SOURCE : drizzle/migrations/0001_create_follows.sql
-- ============================================================
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX follows_following_idx ON public.follows (following_id);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Abonnements visibles publiquement"
ON public.follows FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Un utilisateur suit en son nom"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);

CREATE POLICY "Un utilisateur se désabonne en son nom"
ON public.follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);
-- ============================================================
-- SOURCE : drizzle/migrations/0002_video_posts.sql
-- ============================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'video' CHECK (kind IN ('video')),
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'ai')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 500),
  video_path TEXT NOT NULL,
  trim_start REAL NOT NULL DEFAULT 0 CHECK (trim_start >= 0),
  trim_end REAL CHECK (trim_end IS NULL OR trim_end > trim_start),
  volume REAL NOT NULL DEFAULT 1 CHECK (volume >= 0 AND volume <= 1),
  overlay_text TEXT CHECK (overlay_text IS NULL OR char_length(overlay_text) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX posts_author_idx ON public.posts (author_id, created_at DESC);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publications visibles publiquement"
ON public.posts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Un utilisateur publie en son nom"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id AND split_part(video_path, '/', 1) = auth.uid()::text);

CREATE POLICY "Un utilisateur modifie ses publications"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Un utilisateur supprime ses publications"
ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gateway_job_id TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL CHECK (char_length(prompt) <= 1000),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
  video_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.video_jobs TO authenticated;
GRANT ALL ON public.video_jobs TO service_role;

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur voit ses générations"
ON public.video_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Un utilisateur lance ses générations"
ON public.video_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Un utilisateur met à jour ses générations"
ON public.video_jobs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vidéos lisibles si publiées ou par leur auteur"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.video_path = storage.objects.name)
  )
);

CREATE POLICY "Un utilisateur envoie ses vidéos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Un utilisateur supprime ses vidéos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ============================================================
-- SOURCE : drizzle/migrations/0003_public_reads_via_functions.sql
-- ============================================================
-- Lectures directes limitées au propriétaire ; les pages publiques passent par des fonctions qui ne renvoient que des champs publics.
DROP POLICY IF EXISTS "Profils visibles publiquement" ON public.profiles;
DROP POLICY IF EXISTS "Publications visibles publiquement" ON public.posts;
DROP POLICY IF EXISTS "Abonnements visibles publiquement" ON public.follows;

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.posts FROM anon;
REVOKE SELECT ON public.follows FROM anon;

CREATE POLICY "Un utilisateur lit son propre profil"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Un utilisateur lit ses publications"
ON public.posts FOR SELECT TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Un utilisateur lit ses abonnements"
ON public.follows FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE OR REPLACE FUNCTION public.get_public_profile(_username TEXT)
RETURNS TABLE (
  id UUID, username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT,
  created_at TIMESTAMPTZ, followers_count BIGINT, following_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id)
  FROM public.profiles p
  WHERE lower(p.username) = lower(_username)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.list_video_posts(_author_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, author_id UUID, title TEXT, caption TEXT, video_path TEXT,
  trim_start REAL, trim_end REAL, volume REAL, overlay_text TEXT, source TEXT,
  created_at TIMESTAMPTZ, author_username TEXT, author_display_name TEXT, author_avatar_url TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT po.id, po.author_id, po.title, po.caption, po.video_path,
    po.trim_start, po.trim_end, po.volume, po.overlay_text, po.source, po.created_at,
    pr.username, pr.display_name, pr.avatar_url
  FROM public.posts po
  JOIN public.profiles pr ON pr.id = po.author_id
  WHERE po.kind = 'video' AND (_author_id IS NULL OR po.author_id = _author_id)
  ORDER BY po.created_at DESC
  LIMIT 30
$$;

CREATE OR REPLACE FUNCTION public.username_taken(_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username))
$$;

CREATE OR REPLACE FUNCTION public.is_published_video(_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.posts WHERE video_path = _path)
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_video_posts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.username_taken(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_published_video(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_video_posts(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.username_taken(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_published_video(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Vidéos lisibles si publiées ou par leur auteur" ON storage.objects;
CREATE POLICY "Vidéos lisibles si publiées ou par leur auteur"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_published_video(name)
  )
);
-- ============================================================
-- SOURCE : drizzle/migrations/0004_videos_storage_owner_read.sql
-- ============================================================
-- Les vidéos ne sont lisibles directement que par leur auteur ; les liens de lecture des vidéos publiées sont signés côté serveur.
DROP POLICY IF EXISTS "Vidéos lisibles si publiées ou par leur auteur" ON storage.objects;
CREATE POLICY "Un utilisateur lit ses vidéos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ============================================================
-- SOURCE : drizzle/migrations/0005_avatars_storage_owner_read.sql
-- ============================================================
-- Les avatars ne sont lisibles directement que par leur propriétaire ; les liens des avatars publics sont signés côté serveur.
DROP POLICY IF EXISTS "Avatars lisibles par tous" ON storage.objects;
CREATE POLICY "Un utilisateur lit son propre avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ============================================================
-- SOURCE : drizzle/migrations/0006_engagement_stories_audio_remix_ai.sql
-- ============================================================
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
-- ============================================================
-- SOURCE : drizzle/migrations/0007_profile_update_policies.sql
-- ============================================================
-- ============================================================
-- 0007 — Autorisations manquantes : édition du profil + avatar
-- ------------------------------------------------------------
-- CIBLE UNIQUE : projet Supabase khnncgbpaxhmfejdtjqi
--   (ne jamais exécuter sur xscnbjmiinznzepxzcvn)
--
-- Pré-requis (déjà en place si 0000→0006 ont été appliquées) :
--   * schéma public : profiles, posts, post_likes, post_comments
--   * buckets storage : avatars, videos
-- Contrôle préalable (lecture seule, à exécuter avant ce fichier) :
--   SELECT to_regclass('public.profiles')       AS profiles,
--          to_regclass('public.posts')          AS posts,
--          to_regclass('public.post_likes')     AS post_likes,
--          to_regclass('public.post_comments')  AS post_comments;
--   SELECT id, public FROM storage.buckets WHERE id IN ('avatars','videos');
--   -- attendu : 4 tables non nulles, puis 2 lignes, toutes deux public = false.
--
-- Application : Supabase → SQL Editor → New query → coller ce fichier → Run.
-- Ce fichier ne supprime aucune donnée et ne recrée aucune table :
-- il ne pose que des policies (DROP IF EXISTS + CREATE) et des index
-- (CREATE INDEX IF NOT EXISTS), donc réexécutable sans effet de bord.
-- ------------------------------------------------------------
-- Constat : public.profiles n'avait aucune policy UPDATE.
-- Les mises à jour du profil (display_name, bio, username,
-- avatar_url…) et l'upload d'avatar échouaient donc en silence
-- (0 ligne affectée côté RLS), sans erreur visible pour l'app.
-- ============================================================

-- 1) Profil : un utilisateur authentifié ne peut modifier QUE son profil.
DROP POLICY IF EXISTS "Un utilisateur modifie son profil" ON public.profiles;
CREATE POLICY "Un utilisateur modifie son profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2) Storage : avatars modifiables uniquement dans son propre dossier (<uid>/...).
--    La lecture directe reste réservée au propriétaire (politique posée en 0005) :
--    les avatars affichés publiquement passent par des URLs signées côté serveur.
--    On retire donc la lecture publique, qui contredisait 0005 et exposait
--    tous les fichiers du bucket à `anon`.
DROP POLICY IF EXISTS "Avatars : lecture publique" ON storage.objects;

DROP POLICY IF EXISTS "Avatars : écriture dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars : mise à jour dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : mise à jour dans son dossier"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars : suppression dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Vidéos : mêmes règles par dossier pour les publications.
DROP POLICY IF EXISTS "Vidéos : écriture dans son dossier" ON storage.objects;
CREATE POLICY "Vidéos : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Vidéos : suppression dans son dossier" ON storage.objects;
CREATE POLICY "Vidéos : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Index de performance (fil « Abonnements » et profil public).
CREATE INDEX IF NOT EXISTS posts_author_created_idx ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_idx ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id, created_at);

-- ============================================================
-- SOURCE : drizzle/migrations/0008_storage_buckets.sql
-- ============================================================
-- ============================================================
-- 0008 — Buckets Supabase Storage + politiques canoniques
-- ------------------------------------------------------------
-- Objet : rendre les buckets `avatars` et `videos` explicites.
-- Aucune migration précédente ne les CRÉE : elles supposaient
-- des buckets provisionnés à la main. Sur un projet neuf
-- (ex. neimyzkkyjrieipvtrme) l'upload échouait donc avec
-- « NoSuchBucket ».
--
-- Garanties :
--   * idempotent  : ON CONFLICT (id) DO UPDATE + DROP POLICY IF EXISTS
--   * non destructif : aucun DROP TABLE, aucun DELETE, aucune
--     suppression d'objet stocké.
--   * les deux buckets restent PRIVÉS (public = false) : la lecture
--     passe par des URLs signées générées côté serveur
--     (signStoragePaths / toBrowserUrl).
--
-- Application : Supabase → SQL Editor → coller → Run.
-- ============================================================

-- 1) Buckets ---------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    false,
    5242880, -- 5 Mo
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'videos',
    'videos',
    false,
    52428800, -- 50 Mo
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
  )
ON CONFLICT (id) DO UPDATE
  SET public             = false,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Politiques canoniques ------------------------------------
-- Une seule politique de lecture par bucket, propriétaire uniquement.
-- Les noms employés par 0000/0003/0004/0005/0007 sont retirés pour que
-- l'état final soit identique quel que soit l'ordre d'application.

-- 2.a Avatars
DROP POLICY IF EXISTS "Avatars lisibles par tous" ON storage.objects;
DROP POLICY IF EXISTS "Avatars : lecture publique" ON storage.objects;
DROP POLICY IF EXISTS "Un utilisateur lit son propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Un utilisateur envoie son propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Un utilisateur remplace son propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Un utilisateur supprime son propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars : écriture dans son dossier" ON storage.objects;
DROP POLICY IF EXISTS "Avatars : mise à jour dans son dossier" ON storage.objects;
DROP POLICY IF EXISTS "Avatars : suppression dans son dossier" ON storage.objects;

CREATE POLICY "Avatars : lecture du propriétaire"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars : mise à jour dans son dossier"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2.b Vidéos
DROP POLICY IF EXISTS "Vidéos lisibles si publiées ou par leur auteur" ON storage.objects;
DROP POLICY IF EXISTS "Un utilisateur lit ses vidéos" ON storage.objects;
DROP POLICY IF EXISTS "Vidéos : écriture dans son dossier" ON storage.objects;
DROP POLICY IF EXISTS "Vidéos : mise à jour dans son dossier" ON storage.objects;
DROP POLICY IF EXISTS "Vidéos : suppression dans son dossier" ON storage.objects;

CREATE POLICY "Vidéos : lecture du propriétaire"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Vidéos : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Vidéos : mise à jour dans son dossier"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Vidéos : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Contrôle post-application (lecture seule) ----------------
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('avatars','videos');
-- attendu : 2 lignes, public = false.

COMMIT;

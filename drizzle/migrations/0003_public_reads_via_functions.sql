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
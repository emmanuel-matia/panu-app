-- Photo de couverture du profil (chemin de stockage dans le dossier de l'utilisateur, bucket avatars)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Format du nom d'utilisateur (vérifié aussi côté application) ; NOT VALID pour ne pas bloquer les profils existants
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_.]{3,30}$') NOT VALID;

-- Le profil public renvoie aussi la couverture
DROP FUNCTION IF EXISTS public.get_public_profile(TEXT);
CREATE FUNCTION public.get_public_profile(_username TEXT)
RETURNS TABLE (
  id UUID, username TEXT, display_name TEXT, avatar_url TEXT, cover_url TEXT, bio TEXT,
  created_at TIMESTAMPTZ, followers_count BIGINT, following_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.cover_url, p.bio, p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id)
  FROM public.profiles p
  WHERE lower(p.username) = lower(_username)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_public_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated, service_role;

-- Créations IA privées : chaque utilisateur lit, envoie et supprime uniquement son dossier
CREATE POLICY "Un utilisateur lit ses images IA" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Un utilisateur envoie ses images IA" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Un utilisateur supprime ses images IA" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Un utilisateur lit ses audios IA" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Un utilisateur envoie ses audios IA" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Un utilisateur supprime ses audios IA" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
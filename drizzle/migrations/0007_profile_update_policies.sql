-- ============================================================
-- 0007 — Autorisations manquantes : édition du profil + avatar
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
DROP POLICY IF EXISTS "Avatars : lecture publique" ON storage.objects;
CREATE POLICY "Avatars : lecture publique"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars : écriture dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars : mise à jour dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : mise à jour dans son dossier"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars : suppression dans son dossier" ON storage.objects;
CREATE POLICY "Avatars : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

-- 3) Vidéos : mêmes règles par dossier pour les publications.
DROP POLICY IF EXISTS "Vidéos : écriture dans son dossier" ON storage.objects;
CREATE POLICY "Vidéos : écriture dans son dossier"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "Vidéos : suppression dans son dossier" ON storage.objects;
CREATE POLICY "Vidéos : suppression dans son dossier"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND split_part(name, '/', 1) = auth.uid()::text);

-- 4) Index de performance (fil « Abonnements » et profil public).
CREATE INDEX IF NOT EXISTS posts_author_created_idx ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_idx ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id, created_at);

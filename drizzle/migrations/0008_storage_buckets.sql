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

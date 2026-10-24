-- Les vidéos ne sont lisibles directement que par leur auteur ; les liens de lecture des vidéos publiées sont signés côté serveur.
DROP POLICY IF EXISTS "Vidéos lisibles si publiées ou par leur auteur" ON storage.objects;
CREATE POLICY "Un utilisateur lit ses vidéos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
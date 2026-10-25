-- Les avatars ne sont lisibles directement que par leur propriétaire ; les liens des avatars publics sont signés côté serveur.
DROP POLICY IF EXISTS "Avatars lisibles par tous" ON storage.objects;
CREATE POLICY "Un utilisateur lit son propre avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
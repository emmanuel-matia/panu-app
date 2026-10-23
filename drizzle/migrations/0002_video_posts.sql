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
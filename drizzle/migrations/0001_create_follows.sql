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
-- ==============================================================================
-- PROJET PANU — RESTRUCTURATION UX (MODE INVITÉ) & SÉCURITÉ RLS RENFORCÉE
-- 1. Navigation en Mode Invité (Lecture publique de tous les flux et vidéos)
-- 2. Déclencheurs d'authentification pour interactions
-- 3. Abonnement automatique au Fondateur (emmanuelmatia150@gmail.com)
-- 4. Sécurité RLS stricte & Restriction des rôles (Par défaut 'user')
-- ==============================================================================

-- 1. TABLE FOLLOWS / ABONNEMENTS
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_panu_follow UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- 2. TABLE VIDEOS (SUPPORT DÉDIÉ FLUX VIDÉO / VOD)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status_visibility ON public.videos(status, visibility);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);

-- 3. TABLE LIKES & INTERACTIONS
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_like_target CHECK (post_id IS NOT NULL OR video_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON public.likes(video_id);

-- 4. TABLE COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);

-- ==============================================================================
-- 5. TRIGGER POST-INSCRIPTION : ATTRIBUTION RÔLE 'USER' & AUTO-FOLLOW FONDATEUR
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    assigned_role user_role;
    founder_email_normalized CONSTANT TEXT := 'emmanuelmatia150@gmail.com';
    founder_user_id UUID;
BEGIN
    -- RÈGLE 4 : Par défaut, TOUT utilisateur qui s'inscrit reçoit strictement le rôle 'user'.
    -- Seul le compte du Fondateur officiel reçoit le rôle 'founder'.
    IF LOWER(TRIM(COALESCE(NEW.email, ''))) = founder_email_normalized THEN
        assigned_role := 'founder'::user_role;
    ELSE
        assigned_role := 'user'::user_role;
    END IF;

    -- Nom d'utilisateur par défaut
    clean_username := COALESCE(
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        'createur_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)
    );

    -- 1. Création ou synchronisation du profil utilisateur
    INSERT INTO public.profiles (
        id,
        email,
        username,
        full_name,
        avatar_url,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        clean_username,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'avatar_url',
        assigned_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        role = CASE 
            WHEN LOWER(TRIM(EXCLUDED.email)) = founder_email_normalized THEN 'founder'::user_role
            ELSE public.profiles.role
        END,
        updated_at = NOW();

    -- 2. Compte crédits réels (0 par défaut)
    INSERT INTO public.ai_credits (user_id, balance, free_credits, purchased_credits, used_credits)
    VALUES (NEW.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- RÈGLE 3 : ABONNEMENT AUTOMATIQUE AU FONDATEUR DE L'APPLICATION
    -- Récupérer l'identifiant du profil du Fondateur
    SELECT id INTO founder_user_id 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = founder_email_normalized
    LIMIT 1;

    -- Si le Fondateur existe et que le nouvel utilisateur n'est pas le Fondateur lui-même
    IF founder_user_id IS NOT NULL AND founder_user_id <> NEW.id THEN
        INSERT INTO public.follows (follower_id, following_id, created_at)
        VALUES (NEW.id, founder_user_id, NOW())
        ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Réattacher le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-abonnement rétroactif pour tous les utilisateurs existants au compte Fondateur
DO $$
DECLARE
    f_id UUID;
BEGIN
    SELECT id INTO f_id FROM public.profiles WHERE LOWER(TRIM(email)) = 'emmanuelmatia150@gmail.com' LIMIT 1;
    IF f_id IS NOT NULL THEN
        INSERT INTO public.follows (follower_id, following_id, created_at)
        SELECT p.id, f_id, NOW()
        FROM public.profiles p
        WHERE p.id <> f_id
        ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;
END $$;

-- ==============================================================================
-- 6. POLITIQUES ROW LEVEL SECURITY (RLS) GLOBALES
-- ==============================================================================

-- A. TABLE 'PROFILES'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique de tous les profils (accessible aux invités / non-connectés)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Insertion de son propre profil
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Modification strictement restreinte au propriétaire du profil (auth.uid() = id)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- B. TABLE 'POSTS' (FLUX D'ACCUEIL & PUBLICATIONS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tout le monde (Mode Invité / Visiteurs non connectés)
DROP POLICY IF EXISTS "Published public posts are viewable by everyone" ON public.posts;
CREATE POLICY "Published public posts are viewable by everyone"
ON public.posts FOR SELECT
USING (
    (status = 'published' AND visibility = 'public')
    OR (auth.uid() = author_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Insertion autorisée uniquement pour les utilisateurs authentifiés pour leurs propres contenus
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Modification autorisée uniquement pour le propriétaire
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Suppression autorisée uniquement pour le propriétaire ou l'administration
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (
    auth.uid() = author_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- C. TABLE 'VIDEOS' (FLUX VIDÉO, VOD, SHORTS)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée pour tout le monde (public / invités)
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
CREATE POLICY "Public videos are viewable by everyone"
ON public.videos FOR SELECT
USING (
    (status = 'published' AND visibility = 'public')
    OR (auth.uid() = user_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Insertion autorisée uniquement pour les utilisateurs authentifiés pour leurs propres vidéos
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
CREATE POLICY "Authenticated users can insert videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Modification autorisée uniquement pour le propriétaire
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
CREATE POLICY "Users can update their own videos"
ON public.videos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Suppression autorisée uniquement pour le propriétaire ou l'administration
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
CREATE POLICY "Users can delete their own videos"
ON public.videos FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- D. TABLE 'FOLLOWS'
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone"
ON public.follows FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can follow" ON public.follows;
CREATE POLICY "Authenticated users can follow"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- E. TABLE 'LIKES'
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone"
ON public.likes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can like" ON public.likes;
CREATE POLICY "Authenticated users can like"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike"
ON public.likes FOR DELETE
USING (auth.uid() = user_id);

-- F. TABLE 'COMMENTS'
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone"
ON public.comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

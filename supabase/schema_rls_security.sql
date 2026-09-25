-- ==============================================================================
-- PROJET PANU — SCRIPT COMPLET SQL / RLS POUR L'ÉDITEUR SUPABASE
-- Copiez-collez ce script directement dans le SQL Editor de Supabase pour activer :
-- 1. Mode Invité (Lecture publique totale de tous les flux et vidéos)
-- 2. Abonnement automatique au Fondateur (emmanuelmatia150@gmail.com)
-- 3. Rôle par défaut 'user' (Aucun droit admin pour les utilisateurs externes)
-- 4. Sécurité Row Level Security (RLS) sur toutes les tables
-- ==============================================================================

-- 1. TABLES FONDAMENTALES (FOLLOWS, VIDEOS, LIKES, COMMENTS)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_panu_follow UNIQUE (follower_id, following_id)
);

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

CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TRIGGER D'INSCRIPTION SÉCURISÉ & AUTO-ABONNEMENT AU FONDATEUR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    assigned_role user_role;
    founder_email_normalized CONSTANT TEXT := 'emmanuelmatia150@gmail.com';
    founder_user_id UUID;
BEGIN
    -- Attribution stricte du rôle : 'founder' uniquement pour l'email officiel
    IF LOWER(TRIM(COALESCE(NEW.email, ''))) = founder_email_normalized THEN
        assigned_role := 'founder'::user_role;
    ELSE
        assigned_role := 'user'::user_role;
    END IF;

    clean_username := COALESCE(
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        'createur_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)
    );

    -- Insertion/Mise à jour du profil
    INSERT INTO public.profiles (
        id, email, username, full_name, avatar_url, role, created_at, updated_at
    )
    VALUES (
        NEW.id, NEW.email, clean_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        assigned_role, NOW(), NOW()
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

    -- Compte crédits réels (0 par défaut)
    INSERT INTO public.ai_credits (user_id, balance, free_credits, purchased_credits, used_credits)
    VALUES (NEW.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Auto-abonnement automatique au compte du Fondateur
    SELECT id INTO founder_user_id 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = founder_email_normalized
    LIMIT 1;

    IF founder_user_id IS NOT NULL AND founder_user_id <> NEW.id THEN
        INSERT INTO public.follows (follower_id, following_id, created_at)
        VALUES (NEW.id, founder_user_id, NOW())
        ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Réinitialisation du trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-follow rétroactif pour tous les utilisateurs déjà inscrits
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

-- 3. VERROUILLAGE DES RÔLES (ANTI-PRIVILEGE ESCALATION)
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.role() = 'authenticated' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('founder', 'admin')
            ) THEN
                RAISE EXCEPTION 'Action non autorisée : Vous ne pouvez pas modifier votre rôle administrateur.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 4. POLITIQUES ROW LEVEL SECURITY (RLS) ACTIVES SUR TOUTES LES TABLES

-- A. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- B. Posts (Fil d'actualité & Vidéos)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published public posts are viewable by everyone" ON public.posts;
CREATE POLICY "Published public posts are viewable by everyone" ON public.posts FOR SELECT
USING (
    (status = 'published' AND visibility = 'public')
    OR (auth.uid() = author_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder', 'admin'))
);
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder', 'admin')));

-- C. Videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT
USING (
    (status = 'published' AND visibility = 'public')
    OR (auth.uid() = user_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder', 'admin'))
);
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
CREATE POLICY "Authenticated users can insert videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder', 'admin')));

-- D. Follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.follows;
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- E. Likes & Comments
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can like" ON public.likes;
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

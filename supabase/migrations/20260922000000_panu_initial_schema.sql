-- ==============================================================================
-- PROJET PANU — SCHEMA INITIAL POSTGRESQL & SUPABASE (V1 SOCLE DE PRODUCTION)
-- "Imaginez. Créez. Publiez."
-- Le studio créatif intelligent pensé pour les créateurs africains.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TYPES ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'creator', 'business', 'founder', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_visibility AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. FUNCTION FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLE: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT UNIQUE,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    location TEXT,
    category TEXT DEFAULT 'Créateur de contenu',
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide et unicité
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Trigger updated_at
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. TABLE: SOCIAL_LINKS
CREATE TABLE IF NOT EXISTS public.social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'youtube', 'tiktok', 'instagram', 'x', 'whatsapp', 'website')),
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_user_id ON public.social_links(user_id);

CREATE TRIGGER trg_social_links_updated_at
BEFORE UPDATE ON public.social_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. TABLE: POSTS
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'video')),
    status post_status NOT NULL DEFAULT 'draft',
    visibility post_visibility NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. TABLE: MEDIA
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    bucket TEXT NOT NULL DEFAULT 'post-media',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);

-- 8. TABLE: AI_CREDITS
CREATE TABLE IF NOT EXISTS public.ai_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    free_credits INTEGER NOT NULL DEFAULT 0 CHECK (free_credits >= 0),
    purchased_credits INTEGER NOT NULL DEFAULT 0 CHECK (purchased_credits >= 0),
    used_credits INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ai_credits_updated_at
BEFORE UPDATE ON public.ai_credits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. TABLE: AI_CREDIT_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bonus', 'purchase', 'usage', 'refund')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_tx_user_id ON public.ai_credit_transactions(user_id);

-- 10. TABLE: AI_GENERATIONS
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('script', 'image', 'video', 'voice', 'publication')),
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    result_url TEXT,
    credits_consumed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON public.ai_generations(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Le frontend ne doit jamais être la seule couche de sécurité.
-- ==============================================================================

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- EMPÊCHER L'ÉLÉVATION DE PRIVILÈGES :
    -- Un utilisateur standard ne peut pas modifier son propre rôle en 'founder' ou 'admin'
    AND (
        role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('founder', 'admin')
    )
);

-- SOCIAL LINKS RLS
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social links are viewable by everyone"
ON public.social_links FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own social links"
ON public.social_links FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POSTS RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can insert their own posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (auth.uid() = author_id);

-- MEDIA RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media"
ON public.media FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own media"
ON public.media FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
ON public.media FOR DELETE
USING (auth.uid() = user_id);

-- AI CREDITS RLS
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
ON public.ai_credits FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- AI CREDIT TRANSACTIONS RLS
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.ai_credit_transactions FOR SELECT
USING (auth.uid() = user_id);

-- AI GENERATIONS RLS
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI generations"
ON public.ai_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI generations"
ON public.ai_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTH TRIGGER: CREATION AUTOMATIQUE DU PROFIL ET DU COMPTE CRÉDITS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
BEGIN
    -- Dérivation d'un nom d'utilisateur initial propre
    clean_username := COALESCE(
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        'createur_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)
    );

    -- Insertion du profil
    INSERT INTO public.profiles (id, email, username, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        clean_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        'user'::user_role
    )
    ON CONFLICT (id) DO NOTHING;

    -- Initialisation des crédits réels (0 par défaut)
    INSERT INTO public.ai_credits (user_id, balance, free_credits, purchased_credits, used_credits)
    VALUES (NEW.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger après inscription dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- STORAGE BUCKETS CONFIGURATION
-- Buckets: avatars, post-media, generated-media
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('post-media', 'post-media', true),
    ('generated-media', 'generated-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Post media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

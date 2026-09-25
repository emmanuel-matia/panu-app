-- ==============================================================================
-- PROJET PANU — SÉCURISATION AUTHENTIFICATION & CONFIGURATION COMPTE FOUNDER
-- Compte Founder officiel : emmanuelmatia150@gmail.com
-- ==============================================================================

-- 1. MISE À JOUR SÉCURISÉE DU TRIGGER D'INSCRIPTION AUTH.USERS
-- Lors d'une inscription ou connexion (Google OAuth ou email), seul le compte Founder
-- reçoit le rôle 'founder'. Tous les autres utilisateurs reçoivent strictement 'user'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    assigned_role user_role;
    founder_email_normalized CONSTANT TEXT := 'emmanuelmatia150@gmail.com';
BEGIN
    -- Attribution stricte du rôle
    IF LOWER(TRIM(COALESCE(NEW.email, ''))) = founder_email_normalized THEN
        assigned_role := 'founder'::user_role;
    ELSE
        assigned_role := 'user'::user_role;
    END IF;

    -- Nom d'utilisateur propre initial
    clean_username := COALESCE(
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        'createur_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)
    );

    -- Insertion ou mise à jour du profil
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

    -- Initialisation du compte crédits réels
    INSERT INTO public.ai_credits (user_id, balance, free_credits, purchased_credits, used_credits)
    VALUES (NEW.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Réinstallation du trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ATTRIBUTION IMMÉDIATE DU RÔLE FOUNDER AU COMPTE GMAIL DU FONDATEUR
UPDATE public.profiles
SET role = 'founder'::user_role
WHERE LOWER(TRIM(email)) = 'emmanuelmatia150@gmail.com';

-- 3. VERROUILLAGE CONTRE L'USURPATION DE RÔLE (ANTI-PRIVILEGE ESCALATION)
-- Empêche tout utilisateur normal de modifier sa colonne 'role' via l'API client
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Si l'appel provient d'un utilisateur authentifié classique
        IF auth.role() = 'authenticated' THEN
            -- Vérifier si l'appelant possède déjà le rôle 'founder' ou 'admin'
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('founder', 'admin')
            ) THEN
                RAISE EXCEPTION 'Accès refusé : Seul le Founder ou un administrateur peut modifier les rôles.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- 4. POLITIQUES ROW LEVEL SECURITY (RLS) RENFORCÉES POUR LE FOUNDER
-- Le Founder peut consulter tous les profils réels
DROP POLICY IF EXISTS "Founders can view all profiles" ON public.profiles;
CREATE POLICY "Founders can view all profiles"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Le Founder peut consulter toutes les publications (publiques et brouillons)
DROP POLICY IF EXISTS "Founders can view all posts" ON public.posts;
CREATE POLICY "Founders can view all posts"
ON public.posts FOR SELECT
USING (
    (status = 'published' AND visibility = 'public')
    OR (auth.uid() = author_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Le Founder peut consulter toutes les générations IA
DROP POLICY IF EXISTS "Founders can view all AI generations" ON public.ai_generations;
CREATE POLICY "Founders can view all AI generations"
ON public.ai_generations FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Le Founder peut consulter tous les crédits
DROP POLICY IF EXISTS "Founders can view all credits" ON public.ai_credits;
CREATE POLICY "Founders can view all credits"
ON public.ai_credits FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

-- Le Founder peut consulter toutes les transactions
DROP POLICY IF EXISTS "Founders can view all transactions" ON public.ai_credit_transactions;
CREATE POLICY "Founders can view all transactions"
ON public.ai_credit_transactions FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('founder', 'admin')
    )
);

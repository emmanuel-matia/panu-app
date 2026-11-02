-- Publications : les fichiers doivent appartenir à l'auteur, et la date de création est fixée par le serveur.
CREATE OR REPLACE FUNCTION public.validate_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.video_path IS NULL OR split_part(NEW.video_path, '/', 1) <> NEW.author_id::text
     OR NEW.video_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Fichier de publication invalide';
  END IF;
  IF NEW.cover_path IS NOT NULL AND (split_part(NEW.cover_path, '/', 1) <> NEW.author_id::text
     OR NEW.cover_path LIKE '%..%') THEN
    RAISE EXCEPTION 'Couverture invalide';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.author_id := OLD.author_id;
  END IF;
  IF NEW.remix_of IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.remix_of IS DISTINCT FROM OLD.remix_of) THEN
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = NEW.remix_of AND allow_remix) THEN
      RAISE EXCEPTION 'Le créateur original n''autorise pas les remix de cette publication';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- Stories : le média doit se trouver dans le dossier de l'auteur.
CREATE OR REPLACE FUNCTION public.validate_story_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.media_path IS NULL OR split_part(NEW.media_path, '/', 1) <> NEW.author_id::text
     OR NEW.media_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Fichier de story invalide';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS stories_validate_media ON public.stories;
CREATE TRIGGER stories_validate_media BEFORE INSERT OR UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.validate_story_media();

-- Profils : photo et couverture uniquement depuis le dossier du propriétaire.
CREATE OR REPLACE FUNCTION public.validate_profile_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.avatar_url IS NOT NULL AND (split_part(NEW.avatar_url, '/', 1) <> NEW.id::text
     OR NEW.avatar_url LIKE '%..%') THEN
    RAISE EXCEPTION 'Photo de profil invalide';
  END IF;
  IF NEW.cover_url IS NOT NULL AND (split_part(NEW.cover_url, '/', 1) <> NEW.id::text
     OR NEW.cover_url LIKE '%..%') THEN
    RAISE EXCEPTION 'Photo de couverture invalide';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS profiles_validate_media ON public.profiles;
CREATE TRIGGER profiles_validate_media BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_media();

REVOKE EXECUTE ON FUNCTION public.validate_story_media() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_media() FROM PUBLIC, anon, authenticated;
-- MODÈLES IA (templates) : catalogue réutilisable, compteur d'utilisations réel, administration.
-- Aucune donnée existante n'est modifiée. Retour arrière :
--   DROP FUNCTION list_templates, get_template_for_run, record_template_use, admin_list_templates, admin_save_template, admin_set_template_published;
--   DROP TABLE template_uses, ai_templates; ALTER TABLE video_jobs DROP COLUMN template_id, credit_cost, input_path;
--   (et recréer les politiques INSERT/UPDATE de video_jobs si besoin)

CREATE TABLE public.ai_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 5 AND 400),
  category TEXT NOT NULL CHECK (category IN ('video','photo','musique','business','reseaux')),
  subcategory TEXT NOT NULL CHECK (char_length(subcategory) BETWEEN 2 AND 40),
  kind TEXT NOT NULL CHECK (kind IN ('image','video','music')),
  input_kind TEXT NOT NULL DEFAULT 'none' CHECK (input_kind IN ('none','photo')),
  prompt_template TEXT NOT NULL CHECK (char_length(prompt_template) BETWEEN 10 AND 1500),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fields) = 'array' AND jsonb_array_length(fields) <= 8),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  credit_cost INTEGER NOT NULL CHECK (credit_cost BETWEEN 0 AND 100),
  cover_url TEXT CHECK (cover_url IS NULL OR (cover_url ~ '^https://' AND char_length(cover_url) <= 500)),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind <> 'music' OR input_kind = 'none')
);
CREATE INDEX ai_templates_category_idx ON public.ai_templates (category, is_published);
-- Accès direct fermé : le catalogue passe uniquement par les fonctions ci-dessous.
GRANT ALL ON public.ai_templates TO service_role;
ALTER TABLE public.ai_templates ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ai_templates IS 'Accès via list_templates / get_template_for_run / admin_* (aucune politique directe).';

CREATE TABLE public.template_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ai_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ref_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX template_uses_template_idx ON public.template_uses (template_id, created_at DESC);
CREATE INDEX template_uses_user_idx ON public.template_uses (user_id, created_at DESC);
GRANT ALL ON public.template_uses TO service_role;
ALTER TABLE public.template_uses ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.template_uses IS 'Écrit uniquement par le serveur après une génération réussie (une ligne par création).';

-- Suivi des générations vidéo : modèle utilisé, montant débité (pour un remboursement exact) et photo source temporaire.
ALTER TABLE public.video_jobs
  ADD COLUMN template_id UUID REFERENCES public.ai_templates(id) ON DELETE SET NULL,
  ADD COLUMN credit_cost INTEGER CHECK (credit_cost IS NULL OR credit_cost BETWEEN 0 AND 100),
  ADD COLUMN input_path TEXT;

-- Durcissement : un utilisateur ne crée ni ne modifie plus ses tâches vidéo lui-même
-- (sinon il pourrait fabriquer une tâche en échec pour se faire rembourser). Le serveur s'en charge.
DROP POLICY IF EXISTS "Un utilisateur lance ses générations" ON public.video_jobs;
DROP POLICY IF EXISTS "Un utilisateur met à jour ses générations" ON public.video_jobs;
REVOKE INSERT, UPDATE ON public.video_jobs FROM authenticated;
GRANT ALL ON public.video_jobs TO service_role;

-- Catalogue public (modèles publiés uniquement, sans le texte d'instruction interne).
CREATE OR REPLACE FUNCTION public.list_templates()
RETURNS TABLE(id UUID, slug TEXT, title TEXT, description TEXT, category TEXT, subcategory TEXT, kind TEXT,
  input_kind TEXT, fields JSONB, settings JSONB, credit_cost INTEGER, cover_url TEXT, created_at TIMESTAMPTZ,
  uses_total BIGINT, uses_7d BIGINT, used_by_me BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.slug, t.title, t.description, t.category, t.subcategory, t.kind, t.input_kind, t.fields,
    t.settings, t.credit_cost, t.cover_url, t.created_at,
    (SELECT count(*) FROM public.template_uses u WHERE u.template_id = t.id),
    (SELECT count(*) FROM public.template_uses u WHERE u.template_id = t.id AND u.created_at > now() - interval '7 days'),
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.template_uses u WHERE u.template_id = t.id AND u.user_id = auth.uid()))
  FROM public.ai_templates t
  WHERE t.is_published
  ORDER BY t.created_at DESC
$$;

-- Modèle complet pour la création (inclut les instructions) : connecté uniquement.
CREATE OR REPLACE FUNCTION public.get_template_for_run(_slug TEXT)
RETURNS TABLE(id UUID, slug TEXT, title TEXT, kind TEXT, input_kind TEXT, prompt_template TEXT,
  fields JSONB, settings JSONB, credit_cost INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.slug, t.title, t.kind, t.input_kind, t.prompt_template, t.fields, t.settings, t.credit_cost
  FROM public.ai_templates t
  WHERE t.slug = _slug AND t.is_published AND auth.uid() IS NOT NULL
$$;

-- Compteur réel : appelé uniquement par le serveur après une création réussie (idempotent).
CREATE OR REPLACE FUNCTION public.record_template_use(_template_id UUID, _user_id UUID, _ref UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.template_uses (template_id, user_id, ref_id) VALUES (_template_id, _user_id, _ref)
  ON CONFLICT (ref_id) DO NOTHING
$$;

-- Administration (fondateur et administrateurs).
CREATE OR REPLACE FUNCTION public.admin_list_templates()
RETURNS TABLE(id UUID, slug TEXT, title TEXT, description TEXT, category TEXT, subcategory TEXT, kind TEXT,
  input_kind TEXT, prompt_template TEXT, fields JSONB, settings JSONB, credit_cost INTEGER, cover_url TEXT,
  is_published BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  uses_total BIGINT, uses_7d BIGINT, uses_30d BIGINT, users_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé à l''équipe'; END IF;
  RETURN QUERY
  SELECT t.id, t.slug, t.title, t.description, t.category, t.subcategory, t.kind, t.input_kind, t.prompt_template,
    t.fields, t.settings, t.credit_cost, t.cover_url, t.is_published, t.created_at, t.updated_at,
    (SELECT count(*) FROM public.template_uses u WHERE u.template_id = t.id),
    (SELECT count(*) FROM public.template_uses u WHERE u.template_id = t.id AND u.created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.template_uses u WHERE u.template_id = t.id AND u.created_at > now() - interval '30 days'),
    (SELECT count(DISTINCT u.user_id) FROM public.template_uses u WHERE u.template_id = t.id)
  FROM public.ai_templates t
  ORDER BY t.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_template(_id UUID, _data JSONB) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new UUID;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé à l''équipe'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.ai_templates (slug, title, description, category, subcategory, kind, input_kind,
      prompt_template, fields, settings, credit_cost, cover_url, is_published, created_by)
    VALUES (_data->>'slug', _data->>'title', _data->>'description', _data->>'category', _data->>'subcategory',
      _data->>'kind', COALESCE(_data->>'input_kind', 'none'), _data->>'prompt_template',
      COALESCE(_data->'fields', '[]'::jsonb), COALESCE(_data->'settings', '{}'::jsonb),
      (_data->>'credit_cost')::int, NULLIF(_data->>'cover_url', ''), false, auth.uid())
    RETURNING id INTO _new;
  ELSE
    UPDATE public.ai_templates SET
      title = _data->>'title', description = _data->>'description', category = _data->>'category',
      subcategory = _data->>'subcategory', kind = _data->>'kind', input_kind = COALESCE(_data->>'input_kind', 'none'),
      prompt_template = _data->>'prompt_template', fields = COALESCE(_data->'fields', '[]'::jsonb),
      settings = COALESCE(_data->'settings', '{}'::jsonb), credit_cost = (_data->>'credit_cost')::int,
      cover_url = NULLIF(_data->>'cover_url', ''), updated_at = now()
    WHERE id = _id RETURNING id INTO _new;
    IF _new IS NULL THEN RAISE EXCEPTION 'Modèle introuvable'; END IF;
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, details)
  VALUES (auth.uid(), 'template_saved', jsonb_build_object('template_id', _new, 'slug', _data->>'slug', 'created', _id IS NULL));
  RETURN _new;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_template_published(_id UUID, _published BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé à l''équipe'; END IF;
  UPDATE public.ai_templates SET is_published = _published, updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modèle introuvable'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, details)
  VALUES (auth.uid(), CASE WHEN _published THEN 'template_published' ELSE 'template_unpublished' END,
    jsonb_build_object('template_id', _id));
END $$;

-- Droits : catalogue public en lecture seule ; le reste réservé aux comptes connectés ou au serveur.
REVOKE ALL ON FUNCTION public.list_templates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_template_for_run(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_template_use(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_templates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_template(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_template_published(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_templates() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_template_for_run(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_template_use(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_templates() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_template(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_template_published(UUID, BOOLEAN) TO authenticated, service_role;

-- Bibliothèque initiale (modèles originaux PANU, publiés ; compteurs d'utilisation à zéro).
CREATE FUNCTION pg_temp.seed(_slug TEXT, _title TEXT, _desc TEXT, _cat TEXT, _sub TEXT, _kind TEXT, _input TEXT,
  _prompt TEXT, _fields JSONB, _settings JSONB, _cost INT) RETURNS VOID LANGUAGE sql AS $$
  INSERT INTO public.ai_templates (slug, title, description, category, subcategory, kind, input_kind,
    prompt_template, fields, settings, credit_cost, is_published)
  VALUES (_slug, _title, _desc, _cat, _sub, _kind, _input, _prompt, _fields, _settings, _cost, true)
$$;

-- A. Vidéo IA
SELECT pg_temp.seed('face-transform', 'Transformation de visage', 'Votre photo se métamorphose en un personnage de votre choix, dans une vidéo fluide.', 'video', 'Transformation de visage', 'video', 'photo',
 $p$The person in the reference photo smoothly transforms into {{style}}. Keep a recognizable face, cinematic lighting, fluid morphing transition, high quality.$p$,
 $j$[{"id":"style","label":"Transformation","type":"select","required":true,"options":["un guerrier futuriste en armure lumineuse","un personnage de dessin animé 3D","une statue de marbre vivante","un super-héros africain moderne","un roi ou une reine de légende"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('cinematic-scene', 'Scène cinématique', 'Décrivez une scène : l''IA la tourne comme un plan de cinéma.', 'video', 'Effets cinématiques', 'video', 'none',
 $p$Cinematic shot: {{scene}}. {{mood}} mood, anamorphic lens, smooth camera movement, film grain, high detail.$p$,
 $j$[{"id":"scene","label":"La scène","type":"textarea","required":true,"placeholder":"Ex. : une pirogue qui glisse sur le fleuve Congo au lever du soleil"},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["épique","mystérieuse","chaleureuse","dramatique"]}]$j$,
 $j${"aspect":"16:9","duration":5}$j$, 10);
SELECT pg_temp.seed('photo-animation', 'Photo animée', 'Donnez vie à une photo : sourire, vent, mouvement de caméra.', 'video', 'Animation de photos', 'video', 'photo',
 $p$Animate the photo naturally: {{movement}}. Keep the subject's identity and the composition, subtle realistic motion.$p$,
 $j$[{"id":"movement","label":"Mouvement","type":"select","required":true,"options":["léger sourire et clignement des yeux","vent dans les cheveux et les vêtements","caméra qui avance doucement","ambiance vivante avec particules de lumière"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('pro-transition', 'Transition professionnelle', 'Une transition fluide et soignée entre deux univers, prête à insérer dans vos montages.', 'video', 'Transitions professionnelles', 'video', 'none',
 $p$A seamless professional transition from {{from}} to {{to}}, morphing camera movement, smooth, polished, cinematic.$p$,
 $j$[{"id":"from","label":"De","type":"text","required":true,"placeholder":"Ex. : une ville la nuit"},{"id":"to","label":"Vers","type":"text","required":true,"placeholder":"Ex. : une plage au soleil"}]$j$,
 $j${"aspect":"16:9","duration":5}$j$, 10);
SELECT pg_temp.seed('fantasy-world', 'Monde fantastique', 'Un univers magique, des créatures, des îles flottantes : vous décrivez, l''IA filme.', 'video', 'Effets fantastiques', 'video', 'none',
 $p$A fantasy world: {{world}}. Magical atmosphere, floating particles, epic scale, slow cinematic camera.$p$,
 $j$[{"id":"world","label":"Votre monde","type":"textarea","required":true,"placeholder":"Ex. : des îles flottantes, un arbre géant lumineux et un dragon"}]$j$,
 $j${"aspect":"16:9","duration":5}$j$, 10);
SELECT pg_temp.seed('viral-short', 'Court viral', 'Une vidéo verticale rythmée avec une accroche forte, pensée pour les réseaux.', 'video', 'Vidéos courtes virales', 'video', 'none',
 $p$Vertical short video with a strong hook: {{idea}}. Energetic, dynamic camera, vibrant colors, social media style, {{rhythm}} pace.$p$,
 $j$[{"id":"idea","label":"Votre idée","type":"textarea","required":true,"placeholder":"Ex. : une danseuse saute sur un toit au coucher du soleil"},{"id":"rhythm","label":"Rythme","type":"select","required":true,"options":["rapide","modéré"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);

-- B. Photo IA
SELECT pg_temp.seed('pro-portrait', 'Portrait professionnel', 'Transformez votre photo en portrait de studio pour votre profil, CV ou LinkedIn.', 'photo', 'Portrait professionnel', 'image', 'photo',
 $p$Transform this photo into a professional studio portrait. Keep exactly the same person and face. Outfit: {{outfit}}. Background: {{background}}. Soft studio lighting, sharp, natural skin, corporate headshot.$p$,
 $j$[{"id":"outfit","label":"Tenue","type":"select","required":true,"options":["costume sombre","tenue business décontractée","tenue créative moderne"]},{"id":"background","label":"Fond","type":"select","required":true,"options":["fond gris studio","fond bleu nuit","fond blanc lumineux"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('artistic-transform', 'Transformation artistique', 'Votre photo repeinte dans un style artistique : huile, aquarelle, manga, pop art…', 'photo', 'Transformation artistique', 'image', 'photo',
 $p$Repaint this photo as {{style}}. Keep the person's face recognizable and the composition.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["une peinture à l'huile aux coups de pinceau marqués","une aquarelle délicate","une illustration manga","un portrait pop art coloré","une œuvre inspirée des motifs wax africains"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('fashion-beauty', 'Mode et beauté', 'Un look éditorial de magazine à partir de votre photo.', 'photo', 'Mode et beauté', 'image', 'photo',
 $p$Turn this photo into a high-fashion beauty editorial: {{look}}. Keep the same person and face recognizable, magazine lighting, rich color grading.$p$,
 $j$[{"id":"look","label":"Look","type":"select","required":true,"options":["maquillage doré lumineux","look glamour de soirée","style streetwear urbain","élégance wax africain"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('cinematic-photo', 'Photo cinématique', 'Une image qui ressemble à un plan de film, avec étalonnage cinéma.', 'photo', 'Photos cinématiques', 'image', 'none',
 $p$Cinematic movie still: {{scene}}. {{palette}} color grading, shallow depth of field, film look, highly detailed.$p$,
 $j$[{"id":"scene","label":"La scène","type":"textarea","required":true,"placeholder":"Ex. : une femme avec un parapluie dans une rue pluvieuse la nuit"},{"id":"palette","label":"Couleurs","type":"select","required":true,"options":["teal et orange","chaudes et dorées","froides et bleutées","noir et blanc contrasté"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('poster-design', 'Affiche graphique', 'Une affiche créative avec votre titre : événement, concert, soirée, lancement.', 'photo', 'Affiches et créations graphiques', 'image', 'none',
 $p$Graphic design poster. Exact title text: "{{title}}". Subtitle: {{subtitle}}. Bold modern layout, strong legible typography, color palette: {{colors}}.$p$,
 $j$[{"id":"title","label":"Titre","type":"text","required":true,"placeholder":"Ex. : Nuit Afro Vibes"},{"id":"subtitle","label":"Sous-titre","type":"text","required":false,"placeholder":"Ex. : Samedi 21 h, Kinshasa"},{"id":"colors","label":"Couleurs","type":"select","required":true,"options":["violet, bleu et or","rouge et or","noir et néon","couleurs chaudes vives"]}]$j$,
 $j${"format":"portrait"}$j$, 2);

-- C. Musique
SELECT pg_temp.seed('music-clip', 'Clip musical visuel', 'Des images de clip (scène, lumières, ambiance) à monter sur votre musique. Vidéo sans son.', 'musique', 'Clips musicaux', 'video', 'none',
 $p$Music video visual: {{scene}}. Rhythmic camera moves, stage lights, {{genre}} vibe, cinematic, no on-screen text.$p$,
 $j$[{"id":"scene","label":"La scène","type":"textarea","required":true,"placeholder":"Ex. : une chanteuse sur scène dans la fumée et les projecteurs"},{"id":"genre","label":"Genre","type":"select","required":true,"options":["rumba congolaise","afrobeats","hip-hop","pop","gospel"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('custom-song', 'Chanson personnalisée', 'Une chanson courte dédiée à quelqu''un : prénom, occasion, style et paroles de votre choix.', 'musique', 'Création de chansons personnalisées', 'music', 'none',
 $p$A {{genre}} song for {{occasion}}, dedicated to {{name}}. Warm, memorable melody. Lyrics idea or lyrics: {{lyrics}}.$p$,
 $j$[{"id":"name","label":"Prénom du destinataire","type":"text","required":true,"placeholder":"Ex. : Maman"},{"id":"occasion","label":"Occasion","type":"select","required":true,"options":["un anniversaire","un mariage","la fête des mères","une déclaration d'amour","un encouragement"]},{"id":"genre","label":"Style","type":"select","required":true,"options":["rumba congolaise","afrobeats","gospel","pop","ballade acoustique"]},{"id":"lyrics","label":"Paroles ou idées","type":"textarea","required":false,"placeholder":"Quelques mots, souvenirs ou paroles à intégrer"}]$j$,
 $j${"seconds":30}$j$, 5);
SELECT pg_temp.seed('music-jingle', 'Jingle et ambiance', 'Un jingle ou une musique de fond instrumentale pour vos vidéos.', 'musique', 'Vidéos synchronisées avec la musique', 'music', 'none',
 $p$Short {{style}} instrumental jingle and background music for a video about {{topic}}. Catchy, clean, no vocals.$p$,
 $j$[{"id":"topic","label":"Sujet de la vidéo","type":"text","required":true,"placeholder":"Ex. : ouverture d'une boutique"},{"id":"style","label":"Style","type":"select","required":true,"options":["dynamique","relaxant","épique","joyeux","élégant"]}]$j$,
 $j${"seconds":15}$j$, 5);
SELECT pg_temp.seed('single-cover', 'Pochette de single', 'Une pochette carrée pour votre morceau, avec le titre et le nom de l''artiste.', 'musique', 'Paroles animées', 'image', 'none',
 $p$Square single cover artwork for a {{genre}} song. Exact title text: "{{title}}". Exact artist name text: "{{artist}}". Stylish album artwork, legible typography.$p$,
 $j$[{"id":"title","label":"Titre du morceau","type":"text","required":true,"placeholder":"Ex. : Soleil de Kin"},{"id":"artist","label":"Artiste","type":"text","required":true,"placeholder":"Votre nom d'artiste"},{"id":"genre","label":"Genre","type":"select","required":true,"options":["rumba","afrobeats","hip-hop","pop","gospel"]}]$j$,
 $j${"format":"square"}$j$, 2);

-- D. Business
SELECT pg_temp.seed('product-ad', 'Publicité produit', 'Votre photo de produit devient une courte publicité vidéo premium.', 'business', 'Publicités commerciales', 'video', 'photo',
 $p$Commercial advertising video of the product shown in the photo: {{effect}}. Premium lighting, smooth camera movement, keep the product exactly as in the photo, no extra text.$p$,
 $j$[{"id":"effect","label":"Mise en scène","type":"select","required":true,"options":["rotation lente avec éclats de lumière","éclaboussures d'eau et gouttes","fumée et lumière dorée","studio lumineux élégant"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('product-showcase', 'Présentation de produit', 'Votre produit photographié comme en studio professionnel, prêt pour votre boutique.', 'business', 'Présentation de produits', 'image', 'photo',
 $p$Place the product from the photo in a professional studio photograph: {{setting}}. Keep the product identical, soft shadows, e-commerce quality, no text.$p$,
 $j$[{"id":"setting","label":"Décor","type":"select","required":true,"options":["podium pastel","fond blanc épuré","table en bois chaleureuse","fond sombre luxueux"]}]$j$,
 $j${"format":"square"}$j$, 2);
SELECT pg_temp.seed('promo-poster', 'Affiche de promotion', 'Une affiche promo percutante avec votre accroche et votre offre.', 'business', 'Promotions', 'image', 'none',
 $p$Promotional retail poster. Exact headline text: "{{headline}}". Offer: {{offer}}. Bold readable typography, eye-catching sale style, colors: {{colors}}.$p$,
 $j$[{"id":"headline","label":"Accroche","type":"text","required":true,"placeholder":"Ex. : Grande promo"},{"id":"offer","label":"Offre","type":"text","required":true,"placeholder":"Ex. : -30 % jusqu'à dimanche"},{"id":"colors","label":"Couleurs","type":"select","required":true,"options":["rouge et or","violet et or","bleu et blanc","vert et jaune"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('pro-poster', 'Affiche professionnelle', 'Une affiche sobre et élégante pour votre entreprise ou votre événement.', 'business', 'Affiches professionnelles', 'image', 'none',
 $p$Professional corporate poster. Exact title text: "{{event}}". Organization: {{company}}. Details: {{details}}. Clean elegant design, navy and gold, legible typography.$p$,
 $j$[{"id":"event","label":"Titre","type":"text","required":true,"placeholder":"Ex. : Forum des entrepreneurs"},{"id":"company","label":"Entreprise","type":"text","required":true,"placeholder":"Nom de votre structure"},{"id":"details","label":"Date et lieu","type":"text","required":false,"placeholder":"Ex. : 15 décembre, Kinshasa"}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('marketing-video', 'Vidéo marketing', 'Une vidéo de présentation dynamique pour votre activité, sans tournage.', 'business', 'Vidéos marketing', 'video', 'none',
 $p$Marketing video for {{business}}: {{message}}. Bright modern commercial style, smooth camera movement, optimistic, no on-screen text.$p$,
 $j$[{"id":"business","label":"Votre activité","type":"text","required":true,"placeholder":"Ex. : une boulangerie artisanale"},{"id":"message","label":"Message à faire passer","type":"textarea","required":true,"placeholder":"Ex. : pain frais chaque matin, livraison rapide"}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);

-- E. Réseaux sociaux
SELECT pg_temp.seed('birthday', 'Carte d''anniversaire', 'Une carte d''anniversaire illustrée avec le prénom, à partager en un geste.', 'reseaux', 'Anniversaires', 'image', 'none',
 $p$Birthday greeting card with festive balloons, cake, confetti and warm lights. Include the exact text "Joyeux anniversaire {{name}}". Style: {{style}}.$p$,
 $j$[{"id":"name","label":"Prénom","type":"text","required":true,"placeholder":"Ex. : Grace"},{"id":"style","label":"Style","type":"select","required":true,"options":["illustration chaleureuse","élégant doré","coloré et joyeux"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('memories', 'Souvenir animé', 'Une photo souvenir qui prend vie avec un doux mouvement nostalgique.', 'reseaux', 'Souvenirs', 'video', 'photo',
 $p$Bring this memory to life: {{feel}}. Gentle realistic motion, nostalgic film look, keep faces and composition unchanged.$p$,
 $j$[{"id":"feel","label":"Ambiance","type":"select","required":true,"options":["chaleureuse et nostalgique","joyeuse et lumineuse","calme et tendre"]}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('challenge', 'Défi viral', 'Lancez un défi : une vidéo verticale pleine d''énergie, prête à être imitée.', 'reseaux', 'Challenges', 'video', 'none',
 $p$Viral social challenge video: {{challenge}}. Energetic dance-like movement, vertical, fun, vibrant street setting, handheld camera.$p$,
 $j$[{"id":"challenge","label":"Le défi","type":"textarea","required":true,"placeholder":"Ex. : un pas de danse simple à reproduire en groupe"}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
SELECT pg_temp.seed('story-visual', 'Visuel de Story', 'Un fond vertical soigné pour vos Stories, avec de la place pour votre texte.', 'reseaux', 'Stories', 'image', 'none',
 $p$Vertical social story visual about {{topic}}, {{vibe}} aesthetic, space left for text, no text.$p$,
 $j$[{"id":"topic","label":"Thème","type":"text","required":true,"placeholder":"Ex. : week-end entre amis"},{"id":"vibe","label":"Ambiance","type":"select","required":true,"options":["pastel et doux","néon et nuit","nature et soleil","minimaliste"]}]$j$,
 $j${"format":"portrait"}$j$, 2);
SELECT pg_temp.seed('short-format', 'Format court réseaux', 'Une vidéo verticale courte avec une accroche rapide pour vos réseaux sociaux.', 'reseaux', 'Formats courts pour les réseaux sociaux', 'video', 'none',
 $p$Short vertical video: {{idea}}. Fast hook in the first second, dynamic camera, vibrant colors, social media style.$p$,
 $j$[{"id":"idea","label":"Votre idée","type":"textarea","required":true,"placeholder":"Ex. : un cuisinier de rue fait flamber un wok la nuit"}]$j$,
 $j${"aspect":"9:16","duration":5}$j$, 10);
-- Modèles Musique : 8 nouveaux modèles originaux PANU (compteurs à zéro) + réglages voix/paroles/clip.
-- Aucune donnée existante supprimée ; les modèles déjà présents ne sont pas écrasés (ON CONFLICT DO NOTHING).
INSERT INTO public.ai_templates (slug, title, description, category, subcategory, kind, input_kind,
  prompt_template, fields, settings, credit_cost, is_published)
VALUES
('rap-moderne', 'Rap moderne', 'Un morceau de rap moderne au flow percutant, chanté ou instrumental, prêt pour un clip dynamique.', 'musique', 'Clip dynamique', 'music', 'none',
 $p$A {{mood}} modern {{style}} track about {{theme}}. Hard-hitting drums, deep 808 bass, confident rap flow, catchy hook, polished modern mix.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["trap","rap congolais","boom bap","drill mélodique"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["énergique","fier","sombre","festif"]},{"id":"theme","label":"Thème du morceau","type":"textarea","required":true,"placeholder":"Ex. : la réussite après les galères, la fierté de Kinshasa"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('afro-beat', 'Afro Beat Créatif', 'Un afrobeat moderne et rythmé pour créer un clip viral avec vos photos ou vidéos.', 'musique', 'Danse et rythme', 'music', 'none',
 $p$A {{mood}} {{style}} song about {{theme}}. Groovy percussion, log drums, bright guitar riffs, warm melodic vocals, irresistible danceable rhythm.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["afrobeats","amapiano","afro-fusion","afro-pop"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["joyeuse","sensuelle","énergique","détendue"]},{"id":"theme","label":"Thème du morceau","type":"textarea","required":true,"placeholder":"Ex. : une soirée entre amis au bord du fleuve"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('dance-africa', 'Dance Africa', 'Un titre dansant inspiré des rythmes africains, idéal pour les défis et vidéos de danse.', 'musique', 'Vidéo tendance', 'music', 'none',
 $p$A {{mood}} high-energy {{style}} dance track about {{theme}}. Driving African percussion, rolling bassline, call-and-response chants, built for dancing.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["ndombolo","coupé-décalé","afro-house","afro dance"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["explosive","festive","entraînante"]},{"id":"theme","label":"Thème ou danse","type":"textarea","required":true,"placeholder":"Ex. : un nouveau pas de danse à lancer sur PANU"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('musique-romantique', 'Musique romantique', 'Une chanson d''amour douce et émouvante, à dédier ou à mettre sur vos plus belles photos.', 'musique', 'Clip romantique', 'music', 'none',
 $p$A {{mood}} romantic {{style}} love song about {{theme}}. Soft guitars and keys, gentle groove, heartfelt intimate vocals, beautiful melody.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["rumba douce","ballade R&B","afro-love","acoustique"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["tendre","passionnée","nostalgique"]},{"id":"theme","label":"Votre histoire","type":"textarea","required":true,"placeholder":"Ex. : notre rencontre à Matonge, dix ans d'amour"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('gospel-inspiration', 'Gospel et inspiration', 'Un chant de louange ou d''encouragement, porté par une chorale et des harmonies lumineuses.', 'musique', 'Louange et inspiration', 'music', 'none',
 $p$A {{mood}} {{style}} song about {{theme}}. Uplifting choir harmonies, warm organ and piano, soulful lead vocal, hopeful and spiritual atmosphere.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["gospel africain","louange et adoration","chorale","gospel moderne"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["inspirante","paisible","triomphante"]},{"id":"theme","label":"Message","type":"textarea","required":true,"placeholder":"Ex. : la gratitude, garder la foi dans l'épreuve"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('musique-festive', 'Musique festive', 'Une musique de fête joyeuse pour anniversaires, mariages, retrouvailles et soirées.', 'musique', 'Clip joyeux', 'music', 'none',
 $p$A {{mood}} festive {{style}} party song for {{occasion}}, about {{theme}}. Bright guitars, lively drums, joyful group vocals, celebration vibe.$p$,
 $j$[{"id":"occasion","label":"Occasion","type":"select","required":true,"options":["un anniversaire","un mariage","une fête de famille","une soirée entre amis","une fin d'année"]},{"id":"style","label":"Style","type":"select","required":true,"options":["soukous","rumba festive","afro-pop","coupé-décalé"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["joyeuse","folle","chaleureuse"]},{"id":"theme","label":"Détails à chanter","type":"textarea","required":true,"placeholder":"Ex. : les 30 ans de Grace, toute la famille réunie"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true),
('studio-pro', 'Studio Pro', 'Une chanson complète de qualité studio : couplets, refrain, voix chantée et mixage soigné.', 'musique', 'Chanson IA', 'music', 'none',
 $p$A professional radio-ready {{style}} song at {{tempo}}, {{mood}} mood, about {{theme}}. Full arrangement with intro, verses, big chorus and outro, studio-quality mix and mastering.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["pop moderne","R&B","afro-pop","hip-hop","rumba moderne"]},{"id":"tempo","label":"Tempo","type":"select","required":true,"options":["slow tempo (80 BPM)","mid tempo (100 BPM)","up tempo (125 BPM)"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["émouvante","conquérante","lumineuse","mélancolique"]},{"id":"theme","label":"Sujet de la chanson","type":"textarea","required":true,"placeholder":"Ex. : partir loin de chez soi pour réaliser son rêve"}]$j$,
 $j${"seconds":60,"vocals":"choice","lyrics":true,"clip":true}$j$, 8, true),
('clip-personnalise', 'Clip musical personnalisé', 'Vos photos et vidéos montées en clip vertical sur une musique créée par l''IA ou sur votre propre morceau.', 'musique', 'Clips personnalisés', 'music', 'none',
 $p$A {{mood}} {{style}} song made for a short vertical music video about {{theme}}. Strong rhythm with clear beats for video cuts, catchy hook.$p$,
 $j$[{"id":"style","label":"Style","type":"select","required":true,"options":["afrobeats","rumba","hip-hop","pop","gospel","électro"]},{"id":"mood","label":"Ambiance","type":"select","required":true,"options":["énergique","joyeuse","émouvante","cinématique"]},{"id":"theme","label":"Sujet du clip","type":"textarea","required":true,"placeholder":"Ex. : mes vacances à Kisantu, mon mariage, mon équipe"}]$j$,
 $j${"seconds":30,"vocals":"choice","lyrics":true,"clip":true}$j$, 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Modèles musique existants : règles explicites de voix et clip (les paroles de « Chanson personnalisée » restent dans son champ).
UPDATE public.ai_templates SET settings = settings || '{"vocals":"sung","lyrics":false,"clip":true}'::jsonb, updated_at = now()
WHERE slug = 'custom-song' AND NOT (settings ? 'vocals');
UPDATE public.ai_templates SET settings = settings || '{"vocals":"instrumental","lyrics":false,"clip":true}'::jsonb, updated_at = now()
WHERE slug = 'music-jingle' AND NOT (settings ? 'vocals');
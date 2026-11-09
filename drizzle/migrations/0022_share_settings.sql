CREATE TABLE public.share_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  site_name TEXT NOT NULL DEFAULT 'PANU',
  default_title TEXT NOT NULL DEFAULT 'PANU — Plateforme Africaine Numérique',
  default_description TEXT NOT NULL DEFAULT 'Créez. Partagez. Apprenez. Achetez. Gagnez. Tout dans un seul espace.',
  default_image_path TEXT,
  logo_path TEXT,
  show_stats BOOLEAN NOT NULL DEFAULT TRUE,
  twitter_handle TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT ALL ON public.share_settings TO service_role;
ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.share_settings (id) VALUES (TRUE);

CREATE OR REPLACE FUNCTION public.get_share_settings() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('site_name', site_name, 'default_title', default_title,
    'default_description', default_description, 'default_image_path', default_image_path,
    'logo_path', logo_path, 'show_stats', show_stats, 'twitter_handle', twitter_handle,
    'updated_at', updated_at)
  FROM public.share_settings WHERE id
$$;
REVOKE ALL ON FUNCTION public.get_share_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_share_settings() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_share_settings(_data JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF length(coalesce(_data->>'site_name','')) NOT BETWEEN 1 AND 40
     OR length(coalesce(_data->>'default_title','')) NOT BETWEEN 1 AND 100
     OR length(coalesce(_data->>'default_description','')) NOT BETWEEN 1 AND 300
     OR length(coalesce(_data->>'twitter_handle','')) > 30 THEN
    RAISE EXCEPTION 'Valeurs invalides';
  END IF;
  IF (_data->>'logo_path') IS NOT NULL AND split_part(_data->>'logo_path','/',1) <> auth.uid()::text
     AND (_data->>'logo_path') IS DISTINCT FROM (SELECT logo_path FROM public.share_settings WHERE id) THEN
    RAISE EXCEPTION 'Logo invalide';
  END IF;
  IF (_data->>'default_image_path') IS NOT NULL AND split_part(_data->>'default_image_path','/',1) <> auth.uid()::text
     AND (_data->>'default_image_path') IS DISTINCT FROM (SELECT default_image_path FROM public.share_settings WHERE id) THEN
    RAISE EXCEPTION 'Image invalide';
  END IF;
  UPDATE public.share_settings SET
    site_name = _data->>'site_name', default_title = _data->>'default_title',
    default_description = _data->>'default_description',
    default_image_path = nullif(_data->>'default_image_path',''), logo_path = nullif(_data->>'logo_path',''),
    show_stats = coalesce((_data->>'show_stats')::boolean, TRUE),
    twitter_handle = nullif(_data->>'twitter_handle',''), updated_at = now(), updated_by = auth.uid()
  WHERE id;
  INSERT INTO public.admin_audit_log (actor_id, action, details)
  VALUES (auth.uid(), 'share_settings_updated', jsonb_build_object('site_name', _data->>'site_name'));
END $$;
REVOKE ALL ON FUNCTION public.admin_update_share_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_share_settings(JSONB) TO authenticated;
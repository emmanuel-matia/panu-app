
-- Signalements de contenu
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  post_title TEXT,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam','harcelement','contenu_sexuel','violence','desinformation','autre')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX content_reports_one_per_reporter_post ON public.content_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;
CREATE INDEX content_reports_status_idx ON public.content_reports (status, created_at DESC);
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un utilisateur crée ses signalements" ON public.content_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND handled_by IS NULL);
CREATE POLICY "Un utilisateur voit ses signalements" ON public.content_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.content_reports_prepare() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author UUID; _title TEXT;
BEGIN
  IF NEW.post_id IS NULL THEN RAISE EXCEPTION 'Publication requise'; END IF;
  SELECT author_id, title INTO _author, _title FROM public.posts WHERE id = NEW.post_id;
  IF _author IS NULL THEN RAISE EXCEPTION 'Publication introuvable'; END IF;
  IF _author = NEW.reporter_id THEN RAISE EXCEPTION 'Vous ne pouvez pas signaler votre propre publication'; END IF;
  IF public.is_blocked_between(_author, NEW.reporter_id) THEN RAISE EXCEPTION 'Action impossible avec ce compte'; END IF;
  NEW.target_user_id := _author;
  NEW.post_title := left(_title, 120);
  RETURN NEW;
END $$;
CREATE TRIGGER content_reports_prepare BEFORE INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.content_reports_prepare();

-- Journal d'administration (lecture uniquement via fonction réservée au fondateur)
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_post_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Rôles
CREATE OR REPLACE FUNCTION public.is_founder(_uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND _uid = public.founder_id()
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_founder(_uid) OR public.has_role(_uid, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.my_staff_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_founder(auth.uid()) THEN 'founder'
              WHEN public.has_role(auth.uid(), 'admin') THEN 'admin'
              ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.admin_overview() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _res JSONB; _founder BOOLEAN := public.is_founder(auth.uid());
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  _res := jsonb_build_object(
    'users_total', (SELECT count(*) FROM public.profiles),
    'users_7d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'users_30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'users_active_7d', (SELECT count(*) FROM public.profiles WHERE last_seen_at >= now() - interval '7 days'),
    'posts_total', (SELECT count(*) FROM public.posts),
    'posts_7d', (SELECT count(*) FROM public.posts WHERE created_at >= now() - interval '7 days'),
    'posts_by_kind', COALESCE((SELECT jsonb_object_agg(kind, c) FROM (SELECT kind, count(*) c FROM public.posts GROUP BY kind) k), '{}'::jsonb),
    'stories_active', (SELECT count(*) FROM public.stories WHERE expires_at > now()),
    'comments_total', (SELECT count(*) FROM public.post_comments),
    'likes_total', (SELECT count(*) FROM public.post_likes),
    'views_total', (SELECT count(*) FROM public.post_views),
    'ai_creations_total', (SELECT count(*) FROM public.ai_creations),
    'reports_open', (SELECT count(*) FROM public.content_reports WHERE status = 'open'),
    'reports_total', (SELECT count(*) FROM public.content_reports)
  );
  IF _founder THEN
    _res := _res || jsonb_build_object(
      'admins_count', (SELECT count(*) FROM public.user_roles WHERE role = 'admin' AND user_id <> public.founder_id()),
      'plans', COALESCE((SELECT jsonb_object_agg(plan, c) FROM (SELECT plan, count(*) c FROM public.user_credits GROUP BY plan) p), '{}'::jsonb),
      'ai_credits_spent', COALESCE((SELECT -sum(amount) FROM public.credit_transactions WHERE amount < 0), 0)
    );
  END IF;
  RETURN _res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users(_q TEXT DEFAULT NULL, _limit INT DEFAULT 30, _offset INT DEFAULT 0)
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, created_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ, plan TEXT, role TEXT, posts_count BIGINT, followers_count BIGINT, reports_against BIGINT, email TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _founder BOOLEAN := public.is_founder(auth.uid()); _like TEXT;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  _like := CASE WHEN _q IS NULL OR btrim(_q) = '' THEN NULL
                ELSE '%' || replace(replace(replace(lower(btrim(_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' END;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.created_at, p.last_seen_at, p.deactivated_at,
    COALESCE(uc.plan, 'free'),
    CASE WHEN p.id = public.founder_id() THEN 'founder'
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin') THEN 'admin'
         ELSE 'user' END,
    (SELECT count(*) FROM public.posts x WHERE x.author_id = p.id),
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.id),
    (SELECT count(*) FROM public.content_reports cr WHERE cr.target_user_id = p.id),
    CASE WHEN _founder THEN (SELECT u.email::text FROM auth.users u WHERE u.id = p.id) ELSE NULL END
  FROM public.profiles p
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  WHERE _like IS NULL
     OR lower(p.username) LIKE _like ESCAPE '\'
     OR lower(p.display_name) LIKE _like ESCAPE '\'
     OR (_founder AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id AND lower(u.email::text) LIKE _like ESCAPE '\'))
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100) OFFSET GREATEST(_offset, 0);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_reports(_status TEXT DEFAULT 'open')
RETURNS TABLE(id UUID, status TEXT, reason TEXT, details TEXT, created_at TIMESTAMPTZ, post_id UUID, post_title TEXT,
  post_kind TEXT, reporter_username TEXT, target_user_id UUID, target_username TEXT, handled_by_username TEXT,
  handled_at TIMESTAMPTZ, resolution_note TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT r.id, r.status, r.reason, r.details, r.created_at, r.post_id, COALESCE(po.title, r.post_title), po.kind,
    rp.username, r.target_user_id, tp.username, hp.username, r.handled_at, r.resolution_note
  FROM public.content_reports r
  LEFT JOIN public.posts po ON po.id = r.post_id
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles tp ON tp.id = r.target_user_id
  LEFT JOIN public.profiles hp ON hp.id = r.handled_by
  WHERE _status IS NULL OR _status = 'all' OR r.status = _status
  ORDER BY r.created_at DESC
  LIMIT 100;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(_id UUID, _status TEXT, _note TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rep public.content_reports%ROWTYPE;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _status NOT IN ('resolved','dismissed') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  UPDATE public.content_reports SET status = _status, handled_by = auth.uid(), handled_at = now(),
    resolution_note = left(NULLIF(btrim(_note), ''), 500)
  WHERE id = _id AND status = 'open' RETURNING * INTO _rep;
  IF NOT FOUND THEN RAISE EXCEPTION 'Signalement introuvable ou déjà traité'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, target_post_id, details)
  VALUES (auth.uid(), 'report_' || _status, _rep.target_user_id, _rep.post_id, jsonb_build_object('report_id', _id));
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_post(_post_id UUID, _reason TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.posts%ROWTYPE;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO _p FROM public.posts WHERE id = _post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publication introuvable'; END IF;
  IF public.is_founder(_p.author_id) AND NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'Le contenu du fondateur ne peut pas être modifié par un administrateur';
  END IF;
  UPDATE public.content_reports SET status = 'resolved', handled_by = auth.uid(), handled_at = now(),
    resolution_note = COALESCE(resolution_note, 'Publication supprimée par la modération')
  WHERE post_id = _post_id AND status = 'open';
  DELETE FROM public.posts WHERE id = _post_id;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, target_post_id, details)
  VALUES (auth.uid(), 'post_removed', _p.author_id, _post_id, jsonb_build_object('title', left(_p.title, 120), 'reason', left(NULLIF(btrim(_reason), ''), 300)));
  RETURN jsonb_build_object('media_path', _p.video_path, 'cover_path', _p.cover_path);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE(id UUID, username TEXT, display_name TEXT, role TEXT, email TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name,
    CASE WHEN p.id = public.founder_id() THEN 'founder' ELSE 'admin' END,
    (SELECT u.email::text FROM auth.users u WHERE u.id = p.id)
  FROM public.profiles p
  WHERE p.id = public.founder_id() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
  ORDER BY (p.id = public.founder_id()) DESC, p.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_admin(_target UUID, _grant BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  IF public.is_founder(_target) THEN RAISE EXCEPTION 'Le compte du fondateur ne peut pas être modifié ici'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _target) THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = 'admin';
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), CASE WHEN _grant THEN 'admin_granted' ELSE 'admin_revoked' END, _target, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_plan(_target UUID, _plan TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old TEXT;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  IF _plan NOT IN ('free','premium','pro') THEN RAISE EXCEPTION 'Offre invalide'; END IF;
  SELECT plan INTO _old FROM public.user_credits WHERE user_id = _target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cet utilisateur n''a pas encore de compte de crédits (il ne s''est pas connecté depuis la mise en place)'; END IF;
  UPDATE public.user_credits SET plan = _plan, updated_at = now() WHERE user_id = _target;
  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, details)
  VALUES (auth.uid(), 'plan_changed', _target, jsonb_build_object('from', _old, 'to', _plan));
END $$;

CREATE OR REPLACE FUNCTION public.admin_audit(_limit INT DEFAULT 50)
RETURNS TABLE(id UUID, action TEXT, actor_username TEXT, target_username TEXT, details JSONB, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'Réservé au fondateur'; END IF;
  RETURN QUERY
  SELECT a.id, a.action, ap.username, tp.username, a.details, a.created_at
  FROM public.admin_audit_log a
  LEFT JOIN public.profiles ap ON ap.id = a.actor_id
  LEFT JOIN public.profiles tp ON tp.id = a.target_user_id
  ORDER BY a.created_at DESC LIMIT LEAST(GREATEST(_limit, 1), 200);
END $$;

REVOKE EXECUTE ON FUNCTION public.is_founder(UUID), public.is_staff(UUID), public.my_staff_role(), public.admin_overview(),
  public.admin_list_users(TEXT, INT, INT), public.admin_list_reports(TEXT), public.admin_resolve_report(UUID, TEXT, TEXT),
  public.admin_remove_post(UUID, TEXT), public.admin_list_admins(), public.admin_set_admin(UUID, BOOLEAN),
  public.admin_set_plan(UUID, TEXT), public.admin_audit(INT), public.content_reports_prepare() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_staff_role(), public.admin_overview(), public.admin_list_users(TEXT, INT, INT),
  public.admin_list_reports(TEXT), public.admin_resolve_report(UUID, TEXT, TEXT), public.admin_remove_post(UUID, TEXT),
  public.admin_list_admins(), public.admin_set_admin(UUID, BOOLEAN), public.admin_set_plan(UUID, TEXT), public.admin_audit(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder(UUID), public.is_staff(UUID) TO service_role;

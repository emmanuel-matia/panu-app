CREATE OR REPLACE FUNCTION public.home_suggestions(_seed integer DEFAULT 0, _limit integer DEFAULT 12)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, reason text, mutual_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  mine AS (SELECT following_id FROM public.follows, me WHERE follower_id = me.uid),
  candidates AS (
    -- 1. Ceux qui me suivent déjà
    SELECT f.follower_id AS pid, 'vous_suit'::text AS reason, 0::bigint AS mutual, 1 AS prio
    FROM public.follows f, me WHERE f.following_id = me.uid
    UNION ALL
    -- 2. Amis en commun
    SELECT f2.following_id, 'amis_communs', count(*), 2
    FROM public.follows f2 WHERE f2.follower_id IN (SELECT following_id FROM mine)
    GROUP BY f2.following_id
    UNION ALL
    -- 3. Créateurs actifs (publications publiques des 30 derniers jours)
    SELECT po.author_id, 'actif', count(*), 3
    FROM public.posts po
    WHERE po.visibility = 'public' AND po.created_at > now() - interval '30 days'
    GROUP BY po.author_id
    UNION ALL
    -- 4. Nouveaux membres (30 derniers jours)
    SELECT pr.id, 'nouveau', 0::bigint, 4
    FROM public.profiles pr
    WHERE pr.created_at > now() - interval '30 days'
    UNION ALL
    -- 5. Tous les autres profils découvrables
    SELECT pr2.id, 'suggestion', 0::bigint, 5
    FROM public.profiles pr2
  ),
  ranked AS (
    SELECT DISTINCT ON (c.pid) c.pid, c.reason, c.mutual, c.prio FROM candidates c
    ORDER BY c.pid, c.prio, c.mutual DESC
  )
  SELECT p.id, p.username, p.display_name, p.avatar_url, r.reason, r.mutual
  FROM ranked r JOIN public.profiles p ON p.id = r.pid, me
  WHERE me.uid IS NOT NULL
    AND p.id <> me.uid
    AND p.id NOT IN (SELECT following_id FROM mine)
    AND p.deactivated_at IS NULL
    AND p.searchable
    AND p.follow_policy = 'everyone'
    AND NOT public.is_blocked_between(p.id, me.uid)
  ORDER BY r.prio, r.mutual DESC, md5(p.id::text || _seed::text)
  LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 30)
$function$;

REVOKE ALL ON FUNCTION public.home_suggestions(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.home_suggestions(integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.suggested_profiles()
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, reason text, mutual_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.home_suggestions(0, 20)
$function$;
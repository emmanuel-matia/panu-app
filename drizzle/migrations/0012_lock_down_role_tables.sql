
REVOKE ALL ON public.platform_founder FROM anon, authenticated;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
REVOKE ALL ON public.content_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;

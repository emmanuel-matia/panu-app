REVOKE ALL ON public.payment_methods FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.transactions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
GRANT ALL ON public.transactions TO service_role;
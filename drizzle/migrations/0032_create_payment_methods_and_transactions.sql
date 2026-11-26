CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mobile_money', 'card', 'bank_account', 'google_play')),
  provider TEXT NOT NULL CHECK (char_length(provider) BETWEEN 2 AND 40 AND provider ~ '^[a-z0-9_]+$'),
  label TEXT NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 60),
  account_identifier TEXT NOT NULL CHECK (
    char_length(btrim(account_identifier)) BETWEEN 3 AND 80
    AND strpos(account_identifier, '*') > 0
  ),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un membre consulte ses moyens de paiement"
ON public.payment_methods FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX payment_methods_one_default_per_user
ON public.payment_methods (user_id)
WHERE is_default;

CREATE INDEX payment_methods_user_created_idx
ON public.payment_methods (user_id, created_at DESC);

COMMENT ON COLUMN public.payment_methods.account_identifier IS
'Identifiant masqué uniquement : ne jamais enregistrer un numéro complet, un secret ou des données de carte complètes.';

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  channel TEXT NOT NULL CHECK (channel IN ('google_play', 'mobile_money', 'card', 'bank_transfer')),
  provider TEXT NOT NULL CHECK (char_length(provider) BETWEEN 2 AND 40 AND provider ~ '^[a-z0-9_]+$'),
  amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
  external_reference TEXT CHECK (external_reference IS NULL OR char_length(btrim(external_reference)) BETWEEN 1 AND 160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un membre consulte ses transactions"
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX transactions_provider_external_reference_idx
ON public.transactions (provider, external_reference)
WHERE external_reference IS NOT NULL;

CREATE INDEX transactions_user_created_idx
ON public.transactions (user_id, created_at DESC);

CREATE INDEX transactions_payment_method_idx
ON public.transactions (payment_method_id)
WHERE payment_method_id IS NOT NULL;

CREATE INDEX transactions_status_created_idx
ON public.transactions (status, created_at DESC);

COMMENT ON TABLE public.transactions IS
'Journal des opérations de paiement PANU. Seul le serveur peut écrire ; un retour navigateur ne prouve jamais un paiement.';
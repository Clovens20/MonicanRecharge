-- Tables pour Edge Functions (Reloadly / Stripe checkout)
CREATE TABLE IF NOT EXISTS public.tranzaksyon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  operatè text,
  pays_kòd text NOT NULL DEFAULT 'HT',
  nimewo_resevwa text NOT NULL,
  montant_usd numeric NOT NULL,
  pri_koutaj numeric,
  pri_vann numeric,
  benefis numeric,
  tip text NOT NULL DEFAULT 'airtime',
  plan_id text,
  mòd_peman text,
  estati text NOT NULL DEFAULT 'annatant',
  stripe_payment_id text,
  reloadly_transaction_id text,
  mesaj_estati text,
  pibliye_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS tranzaksyon_user_idx ON public.tranzaksyon (user_id);
CREATE INDEX IF NOT EXISTS tranzaksyon_estati_idx ON public.tranzaksyon (estati);

ALTER TABLE public.tranzaksyon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tranzaksyon_own_read" ON public.tranzaksyon;
CREATE POLICY "tranzaksyon_own_read" ON public.tranzaksyon FOR SELECT USING (auth.uid () = user_id);

COMMENT ON TABLE public.tranzaksyon IS 'Recharges (Stripe / Reloadly) — mises à jour service role depuis Edge.';

CREATE TABLE IF NOT EXISTS public.balans_reloadly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  montant numeric NOT NULL,
  tip text NOT NULL DEFAULT 'wè',
  referans text,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.balans_reloadly ENABLE ROW LEVEL SECURITY;

-- Pas de lecture publique JWT ; lecture admin via service role / dashboard.

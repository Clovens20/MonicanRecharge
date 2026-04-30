-- Recharge carte automatique du solde agent
CREATE TABLE IF NOT EXISTS public.ajan_topup_card (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ajan_id uuid NOT NULL REFERENCES public.ajan (user_id) ON DELETE CASCADE,
  montant_usd numeric NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  estati text NOT NULL DEFAULT 'kredi' CHECK (estati IN ('kredi', 'echwe')),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS ajan_topup_card_ajan_idx ON public.ajan_topup_card (ajan_id);

ALTER TABLE public.ajan_topup_card ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ajan_topup_card_own_read" ON public.ajan_topup_card;
CREATE POLICY "ajan_topup_card_own_read" ON public.ajan_topup_card FOR SELECT USING (auth.uid () = ajan_id);

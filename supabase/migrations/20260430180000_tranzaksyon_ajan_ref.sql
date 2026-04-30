-- Suivi ajan / parrain sur les transactions Stripe → Reloadly
ALTER TABLE public.tranzaksyon
ADD COLUMN IF NOT EXISTS ref_kòd text,
ADD COLUMN IF NOT EXISTS ajan_id uuid REFERENCES public.ajan (user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS komisyon_ajan numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS komisyon_pousantaj numeric;

CREATE INDEX IF NOT EXISTS tranzaksyon_ref_kod_idx ON public.tranzaksyon (ref_kòd);
CREATE INDEX IF NOT EXISTS tranzaksyon_ajan_id_idx ON public.tranzaksyon (ajan_id);

COMMENT ON COLUMN public.tranzaksyon.ref_kòd IS 'Kòd parrain (ex. MON-AG-001) — cookie ?ref=';
COMMENT ON COLUMN public.tranzaksyon.ajan_id IS 'Ajan (ajan.user_id) kifè komisyon sou vann sa a.';

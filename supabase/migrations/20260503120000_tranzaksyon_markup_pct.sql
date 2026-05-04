-- Snapshot % markup global nan moman tranzaksyon an (0 si disabled / ajan)
ALTER TABLE public.tranzaksyon
ADD COLUMN IF NOT EXISTS markup_pct_applied numeric;

COMMENT ON COLUMN public.tranzaksyon.markup_pct_applied IS 'Pousantaj markup global ki te aktif (0 = pa aplike / ajan).';

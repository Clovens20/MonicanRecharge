-- Frè platfòm sou lavant ajan (ex. 5% sou pri_vann)
ALTER TABLE public.tranzaksyon
ADD COLUMN IF NOT EXISTS frais_platfòm_usd numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tranzaksyon.frais_platfòm_usd IS 'Frè Monican sou vann ajan (USD), debite ansanm ak pri_koutaj.';

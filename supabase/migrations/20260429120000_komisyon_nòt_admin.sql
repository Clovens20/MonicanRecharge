-- Nòt opsyonèl lè admin ajoute kredi komisyon manyèlman
ALTER TABLE public.komisyon_tranzaksyon
ADD COLUMN IF NOT EXISTS nòt_admin text;

COMMENT ON COLUMN public.komisyon_tranzaksyon.nòt_admin IS 'Explication admin (kòrèksyon / kredi manyèl).';

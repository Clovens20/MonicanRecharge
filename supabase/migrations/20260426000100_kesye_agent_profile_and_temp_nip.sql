ALTER TABLE public.kesye
ADD COLUMN IF NOT EXISTS non_complet text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS tel text,
ADD COLUMN IF NOT EXISTS nip_temp boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS kesye_email_unique_idx ON public.kesye (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kesye_tel_unique_idx ON public.kesye (tel) WHERE tel IS NOT NULL;
CREATE INDEX IF NOT EXISTS kesye_nip_temp_idx ON public.kesye (nip_temp);

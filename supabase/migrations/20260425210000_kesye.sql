-- Kèsye boutik : NIP 4 chif (hash determinis), sesyon pa cookie sèvis

CREATE TABLE IF NOT EXISTS public.kesye (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  non_boutik text NOT NULL,
  nip_hash text NOT NULL UNIQUE,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS kesye_aktif_idx ON public.kesye (aktif);

ALTER TABLE public.kesye ENABLE ROW LEVEL SECURITY;

-- Pa gen aksè JWT dirèk — sèlman service role (API admin / login)
DROP POLICY IF EXISTS "kesye_deny_jwt" ON public.kesye;

CREATE POLICY "kesye_deny_jwt" ON public.kesye FOR ALL USING (false);

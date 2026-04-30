-- Peman Moncash manyèl + paramèt admin
CREATE TABLE IF NOT EXISTS public.peman_moncash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  order_public_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users (id),
  payload jsonb NOT NULL,
  amount_usd numeric NOT NULL,
  htg_display numeric,
  moncash_numero text,
  screenshot_url text,
  estati text NOT NULL DEFAULT 'annatant' CHECK (estati IN ('annatant', 'konfime', 'refize')),
  admin_nòt text,
  admin_id uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now (),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS peman_moncash_estati_idx ON public.peman_moncash (estati);
CREATE INDEX IF NOT EXISTS peman_moncash_order_idx ON public.peman_moncash (order_public_id);

ALTER TABLE public.peman_moncash ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peman_moncash_own_read" ON public.peman_moncash;

CREATE POLICY "peman_moncash_own_read" ON public.peman_moncash FOR SELECT USING (auth.uid () = user_id);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  kle text PRIMARY KEY,
  valè jsonb NOT NULL,
  mete_ajou timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Pas de lecture publique ; tout via service role.

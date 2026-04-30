-- Demandes d'aide envoyées par les agents depuis leur dashboard
CREATE TABLE IF NOT EXISTS public.demann_ed_ajan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ajan_id uuid NOT NULL REFERENCES public.ajan (user_id) ON DELETE CASCADE,
  sijè text NOT NULL,
  mesaj text NOT NULL,
  estati text NOT NULL DEFAULT 'ouvè' CHECK (estati IN ('ouvè', 'ankou', 'rezoud', 'fèmen')),
  admin_nòt text,
  trete_pa uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS demann_ed_ajan_ajan_idx ON public.demann_ed_ajan (ajan_id);
CREATE INDEX IF NOT EXISTS demann_ed_ajan_estati_idx ON public.demann_ed_ajan (estati);

ALTER TABLE public.demann_ed_ajan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demann_ed_ajan_own_read" ON public.demann_ed_ajan;
CREATE POLICY "demann_ed_ajan_own_read" ON public.demann_ed_ajan FOR SELECT USING (auth.uid () = ajan_id);

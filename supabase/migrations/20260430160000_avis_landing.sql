-- Avis laissés depuis la landing (formulaire public → insertion via service role API uniquement).
CREATE TABLE IF NOT EXISTS public.avis_landing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  non text NOT NULL,
  kote text,
  rating smallint NOT NULL CHECK (
    rating >= 1
    AND rating <= 5
  ),
  mesaj text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS avis_landing_created_idx ON public.avis_landing (created_at DESC);

ALTER TABLE public.avis_landing ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.avis_landing IS 'Avis clients (landing) — INSERT via API Next service role seulement.';

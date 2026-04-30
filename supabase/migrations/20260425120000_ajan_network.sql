-- Réseau sous-agents / revendeurs — exécuter dans Supabase SQL Editor ou via CLI.
-- Nécessite auth.users (Supabase Auth).

-- Profils (base pour ajan)
CREATE TABLE IF NOT EXISTS public.profils (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  non_affichaj text,
  telefòn text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Demandes d’adhésion (avant compte ajan lié)
CREATE TABLE IF NOT EXISTS public.aplasyon_ajan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  non_konplè text NOT NULL,
  imèl text NOT NULL,
  telefòn text,
  non_biznis text,
  vil text,
  peyi text,
  pwomosyon_tekst text,
  estati text NOT NULL DEFAULT 'annatant' CHECK (
    estati IN ('annatant', 'apwouve', 'refize')
  ),
  ajan_user_id uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS aplasyon_ajan_estati_idx ON public.aplasyon_ajan (estati);
CREATE INDEX IF NOT EXISTS aplasyon_ajan_imèl_idx ON public.aplasyon_ajan (imèl);

-- Ajan (1:1 avec utilisateur approuvé)
CREATE TABLE IF NOT EXISTS public.ajan (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  kòd_ajan text NOT NULL UNIQUE,
  non_biznis text,
  sit_wèb text,
  balans_komisyon numeric NOT NULL DEFAULT 0,
  total_tranzaksyon integer NOT NULL DEFAULT 0,
  total_komisyon_ganye numeric NOT NULL DEFAULT 0,
  to_komisyon numeric NOT NULL DEFAULT 5,
  limit_kredi_jounal numeric NOT NULL DEFAULT 500,
  estati text NOT NULL DEFAULT 'aktif' CHECK (estati IN ('annatant', 'aktif', 'sispann')),
  approved_by uuid REFERENCES auth.users (id),
  vil text,
  peyi text,
  aplasyon_id uuid REFERENCES public.aplasyon_ajan (id),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS ajan_kòd_idx ON public.ajan (kòd_ajan);
CREATE INDEX IF NOT EXISTS ajan_estati_idx ON public.ajan (estati);

-- Peman komisyon (batch / mande peman admin → ajan)
CREATE TABLE IF NOT EXISTS public.peman_komisyon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ajan_id uuid NOT NULL REFERENCES public.ajan (user_id) ON DELETE CASCADE,
  montant numeric NOT NULL,
  mòd_peman text,
  referans text,
  nòt text,
  paid_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS peman_komisyon_ajan_idx ON public.peman_komisyon (ajan_id);

-- Liy komisyon pa tranzaksyon (akimile)
CREATE TABLE IF NOT EXISTS public.komisyon_tranzaksyon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ajan_id uuid NOT NULL REFERENCES public.ajan (user_id) ON DELETE CASCADE,
  tranzaksyon_ref text NOT NULL,
  montant_vann_usd numeric NOT NULL,
  pousantaj numeric NOT NULL,
  montant_komisyon numeric NOT NULL,
  estati text NOT NULL DEFAULT 'annatant' CHECK (estati IN ('annatant', 'peye', 'cancel')),
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (ajan_id, tranzaksyon_ref)
);

CREATE INDEX IF NOT EXISTS komisyon_tranzaksyon_ajan_idx ON public.komisyon_tranzaksyon (ajan_id);

-- Envitasyon (admin)
CREATE TABLE IF NOT EXISTS public.invitasyon_ajan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  imèl text NOT NULL,
  kòd_envitasyon text NOT NULL UNIQUE,
  kreye_pa uuid REFERENCES auth.users (id),
  itilize boolean NOT NULL DEFAULT false,
  ekspire_le timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

-- RLS (service role bypass; client utilise anon + policies minimales)
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aplasyon_ajan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peman_komisyon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komisyon_tranzaksyon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitasyon_ajan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profils_own_read" ON public.profils;
DROP POLICY IF EXISTS "profils_own_upsert" ON public.profils;
DROP POLICY IF EXISTS "ajan_own_read" ON public.ajan;
DROP POLICY IF EXISTS "komisyon_own_read" ON public.komisyon_tranzaksyon;

CREATE POLICY "profils_own_read" ON public.profils FOR SELECT USING (auth.uid () = user_id);
CREATE POLICY "profils_own_upsert" ON public.profils FOR ALL USING (auth.uid () = user_id);

CREATE POLICY "ajan_own_read" ON public.ajan FOR SELECT USING (auth.uid () = user_id);

CREATE POLICY "komisyon_own_read" ON public.komisyon_tranzaksyon FOR SELECT USING (auth.uid () = ajan_id);

-- Mande peman (ajan → admin)
CREATE TABLE IF NOT EXISTS public.demann_peman_ajan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ajan_id uuid NOT NULL REFERENCES public.ajan (user_id) ON DELETE CASCADE,
  montant numeric NOT NULL,
  detay text NOT NULL,
  estati text NOT NULL DEFAULT 'annatant' CHECK (estati IN ('annatant', 'apwouve', 'refize', 'peye')),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS demann_peman_ajan_ajan_idx ON public.demann_peman_ajan (ajan_id);

ALTER TABLE public.demann_peman_ajan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demann_own_read" ON public.demann_peman_ajan;

CREATE POLICY "demann_own_read" ON public.demann_peman_ajan FOR SELECT USING (auth.uid () = ajan_id);

-- Aplikasyon : insertion côté API (service role).

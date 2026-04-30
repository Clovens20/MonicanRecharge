-- Recharge otomatik, pwen fidelite, referal kliyan, alèt sekirite

CREATE TABLE IF NOT EXISTS public.rechaj_otomatik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nimewo text NOT NULL,
  operateur_id int NOT NULL,
  montant numeric NOT NULL CHECK (montant > 0),
  frekans text NOT NULL CHECK (
    frekans IN ('chak_semèn', 'chak_2semèn', 'chak_mwa')
  ),
  pwochen_dat date NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  stripe_payment_method_id text,
  stripe_customer_id text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS rechaj_otomatik_user_idx ON public.rechaj_otomatik (user_id);
CREATE INDEX IF NOT EXISTS rechaj_otomatik_due_idx ON public.rechaj_otomatik (pwochen_dat)
WHERE
  aktif = true;

ALTER TABLE public.rechaj_otomatik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rechaj_otomatik_own_all" ON public.rechaj_otomatik;

CREATE POLICY "rechaj_otomatik_own_all" ON public.rechaj_otomatik FOR ALL USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE TABLE IF NOT EXISTS public.pwen_fidelite (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  pwen_total int NOT NULL DEFAULT 0,
  pwen_itilize int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.pwen_fidelite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pwen_fidelite_own" ON public.pwen_fidelite;

CREATE POLICY "pwen_fidelite_own" ON public.pwen_fidelite FOR ALL USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE TABLE IF NOT EXISTS public.referal_kod (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  kod text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.referal_kod ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referal_kod_own_read" ON public.referal_kod;
DROP POLICY IF EXISTS "referal_kod_own_insert" ON public.referal_kod;

CREATE POLICY "referal_kod_own_read" ON public.referal_kod FOR SELECT USING (auth.uid () = user_id);

CREATE POLICY "referal_kod_own_insert" ON public.referal_kod FOR INSERT WITH CHECK (auth.uid () = user_id);

CREATE TABLE IF NOT EXISTS public.referal_atribisyon (
  referee_user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.referal_atribisyon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referal_atribisyon_referee_read" ON public.referal_atribisyon;
DROP POLICY IF EXISTS "referal_atribisyon_referee_insert" ON public.referal_atribisyon;

CREATE POLICY "referal_atribisyon_referee_read" ON public.referal_atribisyon FOR SELECT USING (auth.uid () = referee_user_id);

CREATE TABLE IF NOT EXISTS public.referal_kredi (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  balans_usd numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.referal_kredi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referal_kredi_own" ON public.referal_kredi;

CREATE POLICY "referal_kredi_own" ON public.referal_kredi FOR ALL USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE TABLE IF NOT EXISTS public.referal_bonus_done (
  referee_user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.referal_bonus_done ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referal_bonus_done_own_read" ON public.referal_bonus_done;

CREATE POLICY "referal_bonus_done_own_read" ON public.referal_bonus_done FOR SELECT USING (auth.uid () = referee_user_id);

CREATE TABLE IF NOT EXISTS public.sekirize_alèt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  tip text NOT NULL,
  detay jsonb,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public.sekirize_alèt ENABLE ROW LEVEL SECURITY;

-- Ekri alèt yo sèlman atravè service role (API) — pa gen policy JWT
CREATE POLICY "referal_atribisyon_referee_insert" ON public.referal_atribisyon FOR INSERT WITH CHECK (auth.uid () = referee_user_id);

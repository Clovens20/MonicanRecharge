-- ID opérateur Reloadly (numérique), distinct du libellé `operatè`.
ALTER TABLE public.tranzaksyon
ADD COLUMN IF NOT EXISTS operator_id integer;

CREATE INDEX IF NOT EXISTS tranzaksyon_operator_id_idx ON public.tranzaksyon (operator_id);

COMMENT ON COLUMN public.tranzaksyon.operator_id IS 'Reloadly operatorId (ex. 173 Digicel HT).';

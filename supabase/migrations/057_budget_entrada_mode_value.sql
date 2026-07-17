-- Entrada do orçamento: percentual ou valor fixo

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS entrada_mode TEXT NOT NULL DEFAULT 'percent';

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS entrada_value NUMERIC(14, 2);

ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_entrada_mode_check;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_entrada_mode_check
  CHECK (entrada_mode IN ('percent', 'value'));

COMMENT ON COLUMN public.budgets.entrada_mode IS
  'percent = usa entrada_percent; value = usa entrada_value (R$)';
COMMENT ON COLUMN public.budgets.entrada_value IS
  'Valor fixo de entrada quando entrada_mode = value';

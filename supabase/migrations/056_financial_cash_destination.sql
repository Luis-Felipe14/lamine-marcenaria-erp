-- Destino do valor em receitas: caixa da empresa vs passado na madeireira.
-- Valores com cash_destination = 'madeireira' não entram no Dashboard Executivo.

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS cash_destination TEXT NOT NULL DEFAULT 'empresa';

ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_cash_destination_check;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_cash_destination_check
  CHECK (cash_destination IN ('empresa', 'madeireira'));

COMMENT ON COLUMN public.financial_transactions.cash_destination IS
  'empresa = caixa Laminê (conta no Executivo); madeireira = crédito/material (fora do caixa)';

-- Atualiza RPC de soma para filtrar opcionalmente por destino
DROP FUNCTION IF EXISTS public.sum_financial_amount(text, boolean, date, date, date);

CREATE OR REPLACE FUNCTION public.sum_financial_amount(
  p_type text,
  p_is_paid boolean,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_due_date_to date DEFAULT NULL,
  p_cash_destination text DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.financial_transactions
  WHERE deleted_at IS NULL
    AND type = p_type::financial_type
    AND is_paid = p_is_paid
    AND (p_date_from IS NULL OR paid_date >= p_date_from)
    AND (p_date_to IS NULL OR paid_date <= p_date_to)
    AND (p_due_date_to IS NULL OR due_date <= p_due_date_to)
    AND (p_cash_destination IS NULL OR cash_destination = p_cash_destination);
$$;

GRANT EXECUTE ON FUNCTION public.sum_financial_amount(text, boolean, date, date, date, text) TO authenticated;

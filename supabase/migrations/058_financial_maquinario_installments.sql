-- Categoria Maquinário + cronograma de parcelas em um único lançamento

ALTER TYPE public.financial_category ADD VALUE IF NOT EXISTS 'maquinario';

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS is_installment_plan BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_total_amount NUMERIC(14, 2);

COMMENT ON COLUMN public.financial_transactions.is_installment_plan IS
  'Quando true, as parcelas ficam em financial_installment_schedules';
COMMENT ON COLUMN public.financial_transactions.plan_total_amount IS
  'Valor total do bem/compra parcelada (ex.: máquina)';

CREATE TABLE IF NOT EXISTS public.financial_installment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  installment_number SMALLINT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_installment_schedules_number_check CHECK (installment_number >= 1),
  CONSTRAINT financial_installment_schedules_unique UNIQUE (transaction_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_financial_installment_schedules_tx
  ON public.financial_installment_schedules (transaction_id);

CREATE INDEX IF NOT EXISTS idx_financial_installment_schedules_due
  ON public.financial_installment_schedules (due_date)
  WHERE is_paid = false;

ALTER TABLE public.financial_installment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_schedules select" ON public.financial_installment_schedules;
DROP POLICY IF EXISTS "financial_schedules write" ON public.financial_installment_schedules;

CREATE POLICY "financial_schedules select"
  ON public.financial_installment_schedules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "financial_schedules write"
  ON public.financial_installment_schedules FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Resumo: planos parcelados somam parcelas pagas/pendentes; demais lançamentos como antes
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS TABLE(receitas numeric, despesas numeric, a_pagar numeric, a_receber numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(ft.amount) FILTER (WHERE ft.type = 'receita' AND ft.is_paid = true), 0),
    COALESCE(SUM(ft.amount) FILTER (
      WHERE ft.type = 'despesa'
        AND ft.is_paid = true
        AND COALESCE(ft.is_installment_plan, false) = false
    ), 0)
    + COALESCE((
        SELECT SUM(s.amount)
        FROM public.financial_installment_schedules s
        JOIN public.financial_transactions p ON p.id = s.transaction_id
        WHERE p.deleted_at IS NULL
          AND p.type = 'despesa'
          AND s.is_paid = true
      ), 0),
    COALESCE(SUM(ft.amount) FILTER (
      WHERE ft.type = 'despesa'
        AND ft.is_paid = false
        AND COALESCE(ft.is_installment_plan, false) = false
    ), 0)
    + COALESCE((
        SELECT SUM(s.amount)
        FROM public.financial_installment_schedules s
        JOIN public.financial_transactions p ON p.id = s.transaction_id
        WHERE p.deleted_at IS NULL
          AND p.type = 'despesa'
          AND s.is_paid = false
      ), 0),
    COALESCE(SUM(ft.amount) FILTER (WHERE ft.type = 'receita' AND ft.is_paid = false), 0)
  FROM public.financial_transactions ft
  WHERE ft.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_summary() TO authenticated;

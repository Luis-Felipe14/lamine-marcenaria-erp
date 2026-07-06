-- Soma financeira via RPC (PostgREST bloqueia amount.sum() para perfis com RLS restrito)

CREATE OR REPLACE FUNCTION public.sum_financial_amount(
  p_type text,
  p_is_paid boolean,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_due_date_to date DEFAULT NULL
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
    AND (p_due_date_to IS NULL OR due_date <= p_due_date_to);
$$;

GRANT EXECUTE ON FUNCTION public.sum_financial_amount(text, boolean, date, date, date) TO authenticated;

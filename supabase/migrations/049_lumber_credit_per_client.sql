-- Crédito madereira por cliente + configuração allow_cross_client

INSERT INTO settings (key, value)
VALUES ('lumber_credit', '{"allow_cross_client": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.get_lumber_credit_balance();

CREATE OR REPLACE FUNCTION public.get_lumber_credit_balance(p_client_id UUID DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      CASE
        WHEN movement_type = 'entrada' THEN amount
        ELSE -amount
      END
    ),
    0
  )
  FROM lumberyard_credit_movements
  WHERE deleted_at IS NULL
    AND (p_client_id IS NULL OR client_id = p_client_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_lumber_credit_balance(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_lumber_credit_balances_by_client()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_entrada NUMERIC,
  total_saida NUMERIC,
  balance NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS client_id,
    c.name AS client_name,
    COALESCE(SUM(CASE WHEN m.movement_type = 'entrada' THEN m.amount ELSE 0 END), 0) AS total_entrada,
    COALESCE(SUM(CASE WHEN m.movement_type = 'saida' THEN m.amount ELSE 0 END), 0) AS total_saida,
    COALESCE(
      SUM(CASE WHEN m.movement_type = 'entrada' THEN m.amount ELSE -m.amount END),
      0
    ) AS balance
  FROM lumberyard_credit_movements m
  INNER JOIN clients c ON c.id = m.client_id
  WHERE m.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND m.client_id IS NOT NULL
  GROUP BY c.id, c.name
  HAVING
    COALESCE(SUM(CASE WHEN m.movement_type = 'entrada' THEN m.amount ELSE 0 END), 0) > 0
    OR COALESCE(SUM(CASE WHEN m.movement_type = 'saida' THEN m.amount ELSE 0 END), 0) > 0
  ORDER BY balance DESC, c.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_lumber_credit_balances_by_client() TO authenticated;

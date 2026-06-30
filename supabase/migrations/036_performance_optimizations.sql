-- Funções RPC e índices para otimização de performance

-- Estoque crítico: agregação no servidor em vez de full table scan no cliente
CREATE OR REPLACE FUNCTION public.count_critical_stock()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM materials
  WHERE deleted_at IS NULL
    AND current_stock <= min_stock;
$$;

GRANT EXECUTE ON FUNCTION public.count_critical_stock() TO authenticated;

-- Resumo financeiro: uma única query com agregações
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS TABLE(receitas numeric, despesas numeric, a_pagar numeric, a_receber numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND is_paid = true), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND is_paid = true), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'despesa' AND is_paid = false), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'receita' AND is_paid = false), 0)
  FROM financial_transactions
  WHERE deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_summary() TO authenticated;

-- Saldo de crédito madereira sem transferir todos os movimentos
CREATE OR REPLACE FUNCTION public.get_lumber_credit_balance()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(CASE WHEN movement_type = 'entrada' THEN amount ELSE -amount END),
    0
  )
  FROM lumberyard_credit_movements
  WHERE deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_lumber_credit_balance() TO authenticated;

-- Índice para estoque crítico
CREATE INDEX IF NOT EXISTS idx_materials_critical_stock
  ON public.materials (current_stock, min_stock)
  WHERE deleted_at IS NULL;

-- Índices para busca textual (ilike) em clientes e materiais
CREATE INDEX IF NOT EXISTS idx_clients_name
  ON public.clients (name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_materials_name
  ON public.materials (name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_materials_code
  ON public.materials (code)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

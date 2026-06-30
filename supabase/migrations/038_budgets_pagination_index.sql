-- Índice para paginação de orçamentos

CREATE INDEX IF NOT EXISTS idx_budgets_created_at
  ON public.budgets (created_at DESC)
  WHERE deleted_at IS NULL;

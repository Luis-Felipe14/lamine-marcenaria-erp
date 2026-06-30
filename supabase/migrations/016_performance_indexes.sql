-- Índices para consultas frequentes (dashboard, listagens, filtros)

CREATE INDEX IF NOT EXISTS idx_financial_paid_date
  ON public.financial_transactions (paid_date, type, is_paid)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_unpaid
  ON public.financial_transactions (type, is_paid, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_production_orders_late
  ON public.production_orders (expected_end_date, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_internal_requests_status
  ON public.internal_requests (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lumber_credit_active
  ON public.lumberyard_credit_movements (movement_date DESC, movement_type, client_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_contact_history_lead
  ON public.lead_contact_history (lead_id, contact_date DESC);

CREATE INDEX IF NOT EXISTS idx_budgets_lead
  ON public.budgets (lead_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_type_category
  ON public.financial_transactions (type, category)
  WHERE deleted_at IS NULL;

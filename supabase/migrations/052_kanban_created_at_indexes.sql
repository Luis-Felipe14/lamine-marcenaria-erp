-- Índices parciais para acelerar as listagens ordenadas por created_at
-- (Kanban de pedidos, Kanban de CRM e Ordens de Produção) que filtram deleted_at IS NULL.

CREATE INDEX IF NOT EXISTS idx_orders_created_at_active
  ON orders (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_created_at_active
  ON leads (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_production_orders_created_at_active
  ON production_orders (created_at DESC)
  WHERE deleted_at IS NULL;

-- Ambientes por orçamento (PDF com subtotais por ambiente)

CREATE TABLE budget_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_environments_budget ON budget_environments(budget_id, sort_order);

ALTER TABLE budget_items
  ADD COLUMN environment_id UUID REFERENCES budget_environments(id) ON DELETE SET NULL;

CREATE INDEX idx_budget_items_environment ON budget_items(environment_id);

-- Migra orçamentos existentes: um ambiente por orçamento
INSERT INTO budget_environments (budget_id, name, sort_order)
SELECT
  b.id,
  COALESCE(NULLIF(TRIM(b.environment), ''), 'Geral'),
  0
FROM budgets b
WHERE b.deleted_at IS NULL;

UPDATE budget_items bi
SET environment_id = be.id
FROM budget_environments be
WHERE be.budget_id = bi.budget_id
  AND bi.environment_id IS NULL;

ALTER TABLE budget_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated budget_environments"
  ON budget_environments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

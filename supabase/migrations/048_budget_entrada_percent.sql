-- Percentual de entrada configurável na proposta comercial

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS entrada_percent NUMERIC(5,2) NOT NULL DEFAULT 30;

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_entrada_percent_range;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_entrada_percent_range
  CHECK (entrada_percent >= 0 AND entrada_percent <= 100);

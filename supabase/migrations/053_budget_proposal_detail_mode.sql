-- Modo de detalhe da proposta PDF:
-- items  = lista móveis com valor individual
-- totals = só totais por ambiente + total geral (descrição livre permanece)

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS proposal_detail_mode TEXT NOT NULL DEFAULT 'items';

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_proposal_detail_mode_check;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_proposal_detail_mode_check
  CHECK (proposal_detail_mode IN ('items', 'totals'));

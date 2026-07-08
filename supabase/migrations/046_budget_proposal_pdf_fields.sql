-- Campos para proposta comercial PDF (ambientes e condições)

ALTER TABLE budget_environments
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS commercial_terms TEXT,
  ADD COLUMN IF NOT EXISTS manufacturing_timeline TEXT,
  ADD COLUMN IF NOT EXISTS installation_timeline TEXT,
  ADD COLUMN IF NOT EXISTS proposal_template TEXT NOT NULL DEFAULT 'premium';

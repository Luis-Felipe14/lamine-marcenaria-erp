-- Investimentos em marketing: prestador externo e status de pagamento
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pago';

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_payment_status_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_payment_status_check
  CHECK (payment_status IN ('pago', 'pendente'));

COMMENT ON COLUMN campaigns.provider_name IS 'Nome do prestador externo de marketing';
COMMENT ON COLUMN campaigns.payment_status IS 'pago | pendente';

ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'site';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'trafego_pago';

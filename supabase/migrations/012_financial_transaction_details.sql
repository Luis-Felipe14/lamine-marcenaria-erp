-- Campos adicionais em lançamentos financeiros (Fase 1)

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_payment_method_check;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('pix', 'transferencia', 'dinheiro', 'cartao', 'boleto', 'outros')
  );

COMMENT ON COLUMN public.financial_transactions.notes IS 'Observações, NF, comprovante etc.';
COMMENT ON COLUMN public.financial_transactions.payment_method IS 'pix | transferencia | dinheiro | cartao | boleto | outros';

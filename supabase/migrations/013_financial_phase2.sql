-- Campos adicionais em lançamentos financeiros (Fase 2)

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS installment_number SMALLINT,
  ADD COLUMN IF NOT EXISTS installment_total SMALLINT;

ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_installment_check;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_installment_check
  CHECK (
    (installment_number IS NULL AND installment_total IS NULL)
    OR (
      installment_number IS NOT NULL
      AND installment_total IS NOT NULL
      AND installment_number >= 1
      AND installment_total >= 1
      AND installment_number <= installment_total
    )
  );

COMMENT ON COLUMN public.financial_transactions.supplier_id IS 'Fornecedor (despesas)';
COMMENT ON COLUMN public.financial_transactions.document_number IS 'Número NF, recibo ou boleto';
COMMENT ON COLUMN public.financial_transactions.installment_number IS 'Parcela atual';
COMMENT ON COLUMN public.financial_transactions.installment_total IS 'Total de parcelas';

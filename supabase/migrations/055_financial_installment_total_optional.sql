-- Permite informar só o total de parcelas (sem parcela atual),
-- alinhado ao formulário financeiro (campo "Parcela" removido da UI).

ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_installment_check;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_installment_check CHECK (
    (installment_number IS NULL AND installment_total IS NULL)
    OR (
      installment_number IS NULL
      AND installment_total IS NOT NULL
      AND installment_total >= 1
    )
    OR (
      installment_number IS NOT NULL
      AND installment_total IS NOT NULL
      AND installment_number >= 1
      AND installment_total >= 1
      AND installment_number <= installment_total
    )
  );

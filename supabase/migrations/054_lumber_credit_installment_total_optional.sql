-- Permite informar só o total de parcelas (sem parcela atual),
-- alinhado ao formulário de entrada do crédito da madereira.

ALTER TABLE public.lumberyard_credit_movements
  DROP CONSTRAINT IF EXISTS lumber_credit_installment_check;

ALTER TABLE public.lumberyard_credit_movements
  ADD CONSTRAINT lumber_credit_installment_check CHECK (
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

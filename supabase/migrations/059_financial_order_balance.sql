-- Saldo devedor do pedido (gerado pelo Sinal) abatido automaticamente por pagamentos intermediários

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS is_order_balance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_original_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS balance_transaction_id UUID
    REFERENCES public.financial_transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.financial_transactions.is_order_balance IS
  'Saldo restante do pedido gerado a partir do Sinal';
COMMENT ON COLUMN public.financial_transactions.balance_original_amount IS
  'Saldo antes dos abatimentos — saldo atual = original - pagamentos vinculados';
COMMENT ON COLUMN public.financial_transactions.balance_transaction_id IS
  'Pagamento intermediário: saldo do pedido do qual este valor foi abatido';

UPDATE public.financial_transactions
SET is_order_balance = true,
    balance_original_amount = amount
WHERE type = 'receita'
  AND order_id IS NOT NULL
  AND is_order_balance = false
  AND (
    notes = 'Gerado automaticamente a partir do lançamento de sinal'
    OR description LIKE 'Saldo restante — Pedido #%'
  );

CREATE INDEX IF NOT EXISTS idx_financial_transactions_order_balance
  ON public.financial_transactions (order_id)
  WHERE is_order_balance = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_balance_link
  ON public.financial_transactions (balance_transaction_id)
  WHERE balance_transaction_id IS NOT NULL;

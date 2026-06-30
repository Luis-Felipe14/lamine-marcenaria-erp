-- Simplificar categorias financeiras (parte 2)
-- Execute após 010 (novo enum já commitado).

-- Despesa: utilidades e aluguel → contas_fixas
UPDATE public.financial_transactions
SET category = 'contas_fixas'
WHERE type = 'despesa' AND category IN ('energia', 'agua', 'internet', 'aluguel');

-- Despesa: transporte → compras
UPDATE public.financial_transactions
SET category = 'compra'
WHERE type = 'despesa' AND category = 'transporte';

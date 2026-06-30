-- Simplificar categorias financeiras (parte 1)
-- PostgreSQL exige commit do novo valor de enum antes de usá-lo em UPDATE.

-- Receita: "pagamento" passa a "pedido" (exibido como "Pagamento" na interface)
UPDATE public.financial_transactions
SET category = 'pedido'
WHERE type = 'receita' AND category = 'pagamento';

-- Novo valor de enum — deve ser commitado antes dos UPDATEs em 011
ALTER TYPE financial_category ADD VALUE IF NOT EXISTS 'contas_fixas';

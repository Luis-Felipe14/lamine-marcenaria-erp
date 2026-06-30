-- Remove pipeline "Em acabamento" do funil de pedidos

UPDATE public.orders
SET status = 'em_producao', updated_at = NOW()
WHERE status = 'em_acabamento';

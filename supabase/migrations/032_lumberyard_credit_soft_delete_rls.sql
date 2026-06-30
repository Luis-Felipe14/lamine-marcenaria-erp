-- Corrige 403 ao excluir movimentação do crédito madereira (soft delete via deleted_at).
-- Alinha com compras/produção: escrita liberada para autenticados; leitura só registros ativos.

DROP POLICY IF EXISTS "lumberyard_credit insert" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "lumberyard_credit update" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "lumberyard_credit write" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "Authenticated lumberyard credit write" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "Authenticated lumberyard credit update" ON public.lumberyard_credit_movements;

CREATE POLICY "Authenticated lumberyard credit write"
  ON public.lumberyard_credit_movements
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated lumberyard credit update"
  ON public.lumberyard_credit_movements
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

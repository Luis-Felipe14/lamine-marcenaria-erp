-- Corrige soft delete no crédito madereira:
-- UPDATE precisa de WITH CHECK (true) para permitir deleted_at preenchido.
-- RPC SECURITY DEFINER garante exclusão mesmo com políticas legadas conflitantes.

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lumberyard_credit_movements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lumberyard_credit_movements', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "lumberyard_credit select"
  ON public.lumberyard_credit_movements
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "lumberyard_credit insert"
  ON public.lumberyard_credit_movements
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "lumberyard_credit update"
  ON public.lumberyard_credit_movements
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.soft_delete_lumberyard_credit_movement(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.lumberyard_credit_movements
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação não encontrada ou já excluída' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_lumberyard_credit_movement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_lumberyard_credit_movement(UUID) TO authenticated;

-- Saídas com vários materiais em um único lançamento do extrato

ALTER TABLE public.lumberyard_credit_movements
  ADD COLUMN IF NOT EXISTS material_lines JSONB DEFAULT NULL;

COMMENT ON COLUMN public.lumberyard_credit_movements.material_lines IS
  'Itens da saída (material_id, nome, quantidade, valores). Um lançamento pode conter vários materiais.';

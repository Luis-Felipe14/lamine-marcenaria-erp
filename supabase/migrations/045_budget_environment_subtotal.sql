-- Subtotal editável por ambiente (valor de venda) e total sem mão de obra

ALTER TABLE budget_environments
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Preenche subtotais a partir dos itens existentes
UPDATE budget_environments be
SET subtotal = COALESCE((
  SELECT SUM(bi.total_price)
  FROM budget_items bi
  WHERE bi.environment_id = be.id
), 0)
WHERE subtotal = 0;

CREATE OR REPLACE FUNCTION public.recalculate_budget_total_from_environments(p_budget_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  env_total DECIMAL(12,2);
  discount_val DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO env_total
  FROM budget_environments
  WHERE budget_id = p_budget_id;

  SELECT COALESCE(discount, 0) INTO discount_val
  FROM budgets
  WHERE id = p_budget_id;

  UPDATE budgets
  SET total_value = GREATEST(0, env_total - discount_val)
  WHERE id = p_budget_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_budget_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  items_total DECIMAL(12,2);
  target_budget_id UUID;
BEGIN
  target_budget_id := COALESCE(NEW.budget_id, OLD.budget_id);

  SELECT COALESCE(SUM(total_price), 0) INTO items_total
  FROM budget_items
  WHERE budget_id = target_budget_id;

  UPDATE budgets
  SET materials_cost = items_total
  WHERE id = target_budget_id;

  PERFORM recalculate_budget_total_from_environments(target_budget_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_budget_environments_recalc_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalculate_budget_total_from_environments(
    COALESCE(NEW.budget_id, OLD.budget_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_budget_environments_total ON budget_environments;
CREATE TRIGGER tr_budget_environments_total
  AFTER INSERT OR UPDATE OF subtotal OR DELETE ON budget_environments
  FOR EACH ROW
  EXECUTE FUNCTION tr_budget_environments_recalc_total();

-- Recalcula totais dos orçamentos existentes
DO $$
DECLARE
  bid UUID;
BEGIN
  FOR bid IN SELECT id FROM budgets WHERE deleted_at IS NULL
  LOOP
    PERFORM recalculate_budget_total_from_environments(bid);
  END LOOP;
END;
$$;

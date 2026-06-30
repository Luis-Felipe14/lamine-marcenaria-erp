-- Fase 2: vínculo saída de crédito → compra recebida + estoque

ALTER TABLE public.lumberyard_credit_movements
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id);

CREATE INDEX IF NOT EXISTS idx_lumber_credit_purchase ON public.lumberyard_credit_movements(purchase_id);

COMMENT ON COLUMN public.lumberyard_credit_movements.purchase_id IS 'Compra gerada automaticamente na saída (crédito madereira)';

-- Garantir entrada no estoque ao inserir compra já como recebida
CREATE OR REPLACE FUNCTION public.handle_purchase_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recebido'
     AND NEW.material_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'recebido')
  THEN
    INSERT INTO stock_movements (material_id, movement_type, quantity, unit_cost, responsible_id, notes)
    VALUES (
      NEW.material_id,
      'entrada',
      NEW.quantity,
      NEW.unit_price,
      NEW.requested_by,
      'Entrada automática — compra #' || NEW.number
    );
    NEW.received_at = COALESCE(NEW.received_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_purchase_received ON public.purchases;
CREATE TRIGGER tr_purchase_received
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_purchase_received();

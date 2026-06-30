-- Campos estendidos em materiais (almoxarifado)

DO $$ BEGIN
  CREATE TYPE material_usage_type AS ENUM ('materia_prima', 'consumo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS usage_type material_usage_type NOT NULL DEFAULT 'materia_prima',
  ADD COLUMN IF NOT EXISTS specification TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS max_stock DECIMAL(12,3),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS ncm TEXT,
  ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_materials_supplier_id
  ON public.materials (supplier_id);

CREATE INDEX IF NOT EXISTS idx_materials_usage_type
  ON public.materials (usage_type);

CREATE INDEX IF NOT EXISTS idx_materials_is_active
  ON public.materials (is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_materials_code
  ON public.materials (code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.materials.usage_type IS 'materia_prima = insumo de produção; consumo = uso e consumo';
COMMENT ON COLUMN public.materials.specification IS 'Espessura, cor, medidas, modelo etc.';
COMMENT ON COLUMN public.materials.max_stock IS 'Estoque máximo sugerido (null = sem limite)';
COMMENT ON COLUMN public.materials.last_purchase_price IS 'Último preço pago (atualizado ao receber compra)';

-- Atualiza custo e última compra ao receber material
CREATE OR REPLACE FUNCTION public.handle_purchase_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recebido' AND OLD.status IS DISTINCT FROM 'recebido' AND NEW.material_id IS NOT NULL THEN
    INSERT INTO public.stock_movements (material_id, movement_type, quantity, unit_cost, responsible_id, notes)
    VALUES (
      NEW.material_id,
      'entrada',
      NEW.quantity,
      NEW.unit_price,
      NEW.requested_by,
      'Entrada automática - compra #' || NEW.number
    );

    UPDATE public.materials
    SET
      last_purchase_price = NEW.unit_price,
      last_purchase_at = NOW(),
      unit_cost = CASE WHEN NEW.unit_price > 0 THEN NEW.unit_price ELSE unit_cost END,
      updated_at = NOW()
    WHERE id = NEW.material_id;

    NEW.received_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

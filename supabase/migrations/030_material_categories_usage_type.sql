-- Separa categorias de matéria-prima e uso/consumo

ALTER TABLE public.material_categories
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'materia_prima';

UPDATE public.material_categories
SET usage_type = 'materia_prima'
WHERE usage_type IS NULL OR usage_type = '';

DROP INDEX IF EXISTS public.idx_material_categories_value_active;

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_categories_value_usage_active
  ON public.material_categories (value, usage_type)
  WHERE deleted_at IS NULL;

INSERT INTO public.material_categories (value, label, sort_order, usage_type)
SELECT v, l, o, 'consumo' FROM (VALUES
  ('escritorio', 'Escritório', 1),
  ('acessorios', 'Acessórios / Consumo', 2),
  ('outros', 'Outros', 3)
) AS seed(v, l, o)
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_categories
  WHERE usage_type = 'consumo' AND deleted_at IS NULL
  LIMIT 1
);

COMMENT ON COLUMN public.material_categories.usage_type IS 'materia_prima | consumo';

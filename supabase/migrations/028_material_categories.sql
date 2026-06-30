-- Categorias de material editáveis (gestores)

CREATE TABLE IF NOT EXISTS public.material_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_categories_value_active
  ON public.material_categories (value)
  WHERE deleted_at IS NULL;

INSERT INTO public.material_categories (value, label, sort_order)
SELECT v, l, o FROM (VALUES
  ('mdf', 'MDF', 1),
  ('ferragens', 'Ferragens', 2),
  ('parafusos', 'Parafusos', 3),
  ('cola', 'Cola', 4),
  ('fitas_borda', 'Fitas de Borda', 5),
  ('puxadores', 'Puxadores', 6),
  ('acessorios', 'Acessórios', 7),
  ('escritorio', 'Escritório', 8),
  ('outros', 'Outros', 9)
) AS seed(v, l, o)
WHERE NOT EXISTS (SELECT 1 FROM public.material_categories LIMIT 1);

-- Permite novos slugs além do enum legado
ALTER TABLE public.materials ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.materials
  ALTER COLUMN category TYPE TEXT USING category::text;
ALTER TABLE public.materials ALTER COLUMN category SET DEFAULT 'outros';

ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_categories select" ON public.material_categories;
CREATE POLICY "material_categories select"
  ON public.material_categories FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "material_categories write" ON public.material_categories;
CREATE POLICY "material_categories write"
  ON public.material_categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

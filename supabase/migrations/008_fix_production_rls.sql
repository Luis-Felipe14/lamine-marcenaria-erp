-- Corrige 403 ao criar OP e apontamentos (production_orders / production_time_entries)
-- Execute no SQL Editor do Supabase se "Nova OP" falhar com 403.

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth full access production_orders" ON public.production_orders;
DROP POLICY IF EXISTS "Authenticated production orders" ON public.production_orders;
CREATE POLICY "Authenticated production orders"
  ON public.production_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.production_time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth full access production_time_entries" ON public.production_time_entries;
DROP POLICY IF EXISTS "Authenticated production time entries" ON public.production_time_entries;
CREATE POLICY "Authenticated production time entries"
  ON public.production_time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Outras tabelas operacionais da migration 005 (caso políticas não tenham sido criadas)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campaigns','budget_items','stock_movements','purchases','suppliers','internal_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth full access %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated %s" ON public.%I', replace(t, '_', ' '), t);
    EXECUTE format(
      'CREATE POLICY "Authenticated %s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      replace(t, '_', ' '), t
    );
  END LOOP;
END $$;

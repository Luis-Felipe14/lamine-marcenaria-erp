-- Auditoria: RLS adicional e políticas de segurança

-- Corrigir INSERT em users (trigger SECURITY DEFINER bypassa RLS)
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.users;
DROP POLICY IF EXISTS "Users insert own profile" ON public.users;

-- Admins podem listar usuários
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('administrador', 'gestor_geral')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins read all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated read user names" ON public.users;

-- Leitura: próprio perfil, admins veem todos, demais veem nomes (joins)
CREATE POLICY "Users select policy"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR auth.role() = 'authenticated'
  );

-- Settings: leitura autenticada, escrita admin
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read settings" ON settings;
CREATE POLICY "Authenticated read settings" ON settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage settings" ON settings;
CREATE POLICY "Admins manage settings" ON settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tabelas operacionais com RLS básico
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas genéricas autenticadas (refinar por papel em versão futura)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campaigns','budget_items','production_orders','production_time_entries',
    'stock_movements','purchases','suppliers','employees',
    'internal_requests','request_history','lead_contact_history','order_status_history'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth full access %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Auth full access %s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

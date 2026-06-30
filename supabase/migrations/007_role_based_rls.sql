-- RLS granular por papel (complementa políticas genéricas de 001/005)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('administrador', 'gestor_geral')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC allowed TEXT[])
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR public.current_user_role() = ANY(allowed);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Funcionários: leitura autenticada, escrita admin/gestor
DROP POLICY IF EXISTS "Auth full access employees" ON public.employees;
DROP POLICY IF EXISTS "employees select" ON public.employees;
DROP POLICY IF EXISTS "employees insert" ON public.employees;
DROP POLICY IF EXISTS "employees update" ON public.employees;
DROP POLICY IF EXISTS "employees delete" ON public.employees;

CREATE POLICY "employees select"
  ON public.employees FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "employees insert"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role('administrador', 'gestor_geral'));

CREATE POLICY "employees update"
  ON public.employees FOR UPDATE TO authenticated
  USING (public.has_any_role('administrador', 'gestor_geral'))
  WITH CHECK (public.has_any_role('administrador', 'gestor_geral'));

-- Financeiro: leitura ampla, escrita financeiro/admin/gestor
DROP POLICY IF EXISTS "Authenticated financial" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial select" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial write" ON public.financial_transactions;

CREATE POLICY "financial select"
  ON public.financial_transactions FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "financial write"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (public.has_any_role('administrador', 'gestor_geral', 'financeiro'))
  WITH CHECK (public.has_any_role('administrador', 'gestor_geral', 'financeiro'));

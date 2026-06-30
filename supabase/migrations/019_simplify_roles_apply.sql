-- Parte 2/2: perfis simplificados (gestor, secretaria, producao)
-- Requer 018_simplify_roles_enums.sql já executado e commitado

INSERT INTO roles (name, label, permissions) VALUES
  (
    'gestor',
    'Gestor / Administrador',
    '["*"]'::jsonb
  ),
  (
    'secretaria',
    'Secretaria',
    '[
      "dashboard.read","dashboard.operacional",
      "inventory.*","purchases.*","lumber_credit.*",
      "financial.*","employees.read",
      "orders.read","production.read",
      "reports.read","requests.read","notifications.read"
    ]'::jsonb
  ),
  (
    'producao',
    'Produção',
    '[
      "dashboard.read","dashboard.operacional",
      "production.*","orders.read",
      "requests.*","notifications.read"
    ]'::jsonb
  )
ON CONFLICT (name) DO UPDATE
  SET label = EXCLUDED.label,
      permissions = EXCLUDED.permissions,
      updated_at = NOW();

-- Migrar usuários dos perfis antigos
UPDATE public.users u
SET role_id = r_new.id, updated_at = NOW()
FROM roles r_new, roles r_old
WHERE u.role_id = r_old.id
  AND r_new.name = 'gestor'
  AND r_old.name IN ('administrador', 'gestor_geral', 'comercial', 'marketing', 'financeiro', 'consulta');

UPDATE public.users u
SET role_id = r_new.id, updated_at = NOW()
FROM roles r_new, roles r_old
WHERE u.role_id = r_old.id
  AND r_new.name = 'secretaria'
  AND r_old.name IN ('almoxarifado');

UPDATE public.users u
SET role_id = r_new.id, updated_at = NOW()
FROM roles r_new, roles r_old
WHERE u.role_id = r_old.id
  AND r_new.name = 'producao'
  AND r_old.name IN ('operacional');

-- Setores (departments) alinhados à equipe
INSERT INTO departments (name, label) VALUES
  ('gestao', 'Gestão'),
  ('secretaria', 'Secretaria')
ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label;

UPDATE departments SET label = 'Produção' WHERE name = 'operacional';

UPDATE employees e SET department_id = d_new.id
FROM departments d_new, departments d_old
WHERE e.department_id = d_old.id
  AND d_new.name = 'gestao'
  AND d_old.name IN ('comercial', 'marketing', 'financeiro');

UPDATE employees e SET department_id = d_new.id
FROM departments d_new, departments d_old
WHERE e.department_id = d_old.id
  AND d_new.name = 'secretaria'
  AND d_old.name = 'almoxarifado';

-- Admin / gestor
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('gestor', 'administrador', 'gestor_geral')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Financeiro: gestor + secretaria
DROP POLICY IF EXISTS "financial write" ON public.financial_transactions;
CREATE POLICY "financial write"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (public.has_any_role('gestor', 'administrador', 'gestor_geral', 'secretaria', 'financeiro'))
  WITH CHECK (public.has_any_role('gestor', 'administrador', 'gestor_geral', 'secretaria', 'financeiro'));

-- Crédito madereira: gestor + secretaria
DROP POLICY IF EXISTS "lumberyard_credit insert" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "lumberyard_credit update" ON public.lumberyard_credit_movements;
DROP POLICY IF EXISTS "lumberyard_credit write" ON public.lumberyard_credit_movements;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lumberyard_credit_movements'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "lumberyard_credit insert"
        ON public.lumberyard_credit_movements FOR INSERT TO authenticated
        WITH CHECK (public.has_any_role('gestor', 'administrador', 'gestor_geral', 'secretaria', 'almoxarifado'))
    $p$;
    EXECUTE $p$
      CREATE POLICY "lumberyard_credit update"
        ON public.lumberyard_credit_movements FOR UPDATE TO authenticated
        USING (public.has_any_role('gestor', 'administrador', 'gestor_geral', 'secretaria', 'almoxarifado'))
        WITH CHECK (public.has_any_role('gestor', 'administrador', 'gestor_geral', 'secretaria', 'almoxarifado'))
    $p$;
  END IF;
END $$;

-- Gestores podem alterar perfil de usuários
DROP POLICY IF EXISTS "Gestores update users" ON public.users;
CREATE POLICY "Gestores update users"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Novo usuário entra como Produção; gestor altera depois
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'producao' LIMIT 1;

  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'consulta' LIMIT 1;
  END IF;

  IF default_role_id IS NULL THEN
    RAISE EXCEPTION 'Perfil padrão não encontrado na tabela roles';
  END IF;

  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    default_role_id
  );

  RETURN NEW;
END;
$$;

-- Corrige erro "Database error creating new user"
-- Causa: trigger sem permissão RLS / role consulta ausente

-- Garantir roles (incluindo consulta e administrador)
INSERT INTO roles (name, label, permissions) VALUES
  ('administrador', 'Administrador', '["*"]'),
  ('gestor_geral', 'Gestor Geral', '["dashboard.*","crm.*","clients.*","budgets.*","orders.*","production.*","inventory.*","purchases.*","financial.*","marketing.*","employees.*","reports.*","settings.read"]'),
  ('comercial', 'Comercial / Vendas', '["dashboard.comercial","crm.*","clients.*","budgets.*","orders.read","reports.comercial"]'),
  ('marketing', 'Marketing', '["dashboard.marketing","crm.read","marketing.*","reports.marketing"]'),
  ('financeiro', 'Financeiro / Administrativo', '["dashboard.financeiro","financial.*","purchases.*","clients.read","orders.read","reports.financial"]'),
  ('operacional', 'Operacional', '["dashboard.operacional","orders.*","production.*","inventory.read"]'),
  ('almoxarifado', 'Almoxarifado', '["dashboard.operacional","inventory.*","purchases.read"]'),
  ('consulta', 'Usuário Consulta', '["dashboard.read","*.read"]')
ON CONFLICT (name) DO NOTHING;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar função com SECURITY DEFINER e search_path correto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'consulta' LIMIT 1;

  IF default_role_id IS NULL THEN
    RAISE EXCEPTION 'Perfil consulta não encontrado na tabela roles';
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

-- Política para o trigger conseguir inserir (admin cria usuário sem auth.uid())
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.users;
CREATE POLICY "Allow profile creation on signup"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

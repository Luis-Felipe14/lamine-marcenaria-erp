-- Garantir perfis simplificados e permitir criação de login via Edge Function (gestor)

-- Enum (ignora se 018 já rodou)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretaria';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'producao';

INSERT INTO roles (name, label, permissions) VALUES
  ('gestor', 'Gestor / Administrador', '["*"]'::jsonb),
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

-- Política para criação de perfil (trigger ou Edge Function)
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.users;
CREATE POLICY "Allow profile creation on signup"
  ON public.users
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Trigger: perfil via metadata; pula se Edge Function criar o perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role_name TEXT;
  target_role_id UUID;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'created_by_admin', '') = 'true' THEN
    RETURN NEW;
  END IF;

  meta_role_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'role_name'), '');

  IF meta_role_name IS NOT NULL THEN
    SELECT id INTO target_role_id
    FROM public.roles
    WHERE name::text = meta_role_name
    LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles WHERE name::text = 'producao' LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles WHERE name::text = 'gestor' LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles WHERE name::text = 'consulta' LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles ORDER BY created_at LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum perfil encontrado na tabela roles';
  END IF;

  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    target_role_id
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role_id = EXCLUDED.role_id,
      updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

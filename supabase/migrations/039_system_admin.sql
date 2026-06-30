-- Administrador geral do sistema (Elius Tecnologia): acesso oculto, protegido e bloqueio por inadimplência

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_system_admin
  ON public.users ((true))
  WHERE is_system_admin = true AND deleted_at IS NULL;

INSERT INTO public.settings (key, value)
VALUES
  (
    'system_admin',
    '{"email":"eliustecnologiace@gmail.com","label":"Elius Tecnologia"}'::jsonb
  ),
  (
    'system_billing',
    '{
      "locked": false,
      "message": "O acesso ao sistema está temporariamente suspenso por pendência de pagamento. Entre em contato com a Elius Tecnologia."
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT u.is_system_admin
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.is_active = true
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_system_billing_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.settings WHERE key = 'system_billing'),
    '{"locked": false}'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_system_billing_status() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.set_system_billing_lock(
  p_locked boolean,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_value jsonb;
  next_value jsonb;
BEGIN
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Somente o administrador do sistema pode alterar o bloqueio de acesso';
  END IF;

  current_value := public.get_system_billing_status();
  next_value := jsonb_build_object(
    'locked', p_locked,
    'message', COALESCE(
      NULLIF(trim(p_message), ''),
      current_value->>'message',
      'O acesso ao sistema está temporariamente suspenso por pendência de pagamento. Entre em contato com a Elius Tecnologia.'
    ),
    'updated_at', to_jsonb(now())
  );

  INSERT INTO public.settings (key, value)
  VALUES ('system_billing', next_value)
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  RETURN next_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_system_billing_lock(boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_system_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system_admin THEN
    RAISE EXCEPTION 'O administrador do sistema não pode ser removido';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_system_admin THEN
    IF NOT public.is_system_admin()
       AND current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'O administrador do sistema não pode ser alterado por outros usuários';
    END IF;

    NEW.is_system_admin := true;
    NEW.is_active := true;
    NEW.deleted_at := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_system_admin AND NOT OLD.is_system_admin THEN
    IF NOT public.is_system_admin()
       AND current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Somente o administrador do sistema pode conceder privilégios de administrador';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_system_admin_user ON public.users;
CREATE TRIGGER tr_protect_system_admin_user
  BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_admin_user();

DROP POLICY IF EXISTS "Users select policy" ON public.users;
CREATE POLICY "Users select policy"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      COALESCE(is_system_admin, false) = false
      AND (
        public.is_admin()
        OR auth.role() = 'authenticated'
      )
    )
  );

DROP POLICY IF EXISTS "Admins manage settings" ON public.settings;
CREATE POLICY "Admins manage general settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (
    key NOT IN ('system_admin', 'system_billing')
    AND public.is_admin()
  )
  WITH CHECK (
    key NOT IN ('system_admin', 'system_billing')
    AND public.is_admin()
  );

CREATE POLICY "System admin manage protected settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (
    key IN ('system_admin', 'system_billing')
    AND public.is_system_admin()
  )
  WITH CHECK (
    key IN ('system_admin', 'system_billing')
    AND public.is_system_admin()
  );

-- Promove usuário existente com o e-mail configurado
UPDATE public.users u
SET
  is_system_admin = true,
  is_active = true,
  role_id = r.id,
  updated_at = NOW()
FROM public.settings s
JOIN public.roles r ON r.name = 'gestor'
WHERE s.key = 'system_admin'
  AND lower(u.email) = lower(s.value->>'email')
  AND u.deleted_at IS NULL;

-- Bootstrap do administrador: desliga o trigger temporariamente (SQL Editor não expõe role postgres)

CREATE OR REPLACE FUNCTION public.protect_system_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  db_role text := coalesce(nullif(current_setting('role', true), ''), 'none');
  privileged_bootstrap boolean := (
    db_role IN ('service_role', 'postgres', 'supabase_admin')
    OR current_user IN ('postgres', 'supabase_admin')
  );
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system_admin THEN
    RAISE EXCEPTION 'O administrador do sistema não pode ser removido';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_system_admin THEN
    IF NOT public.is_system_admin() AND NOT privileged_bootstrap THEN
      RAISE EXCEPTION 'O administrador do sistema não pode ser alterado por outros usuários';
    END IF;

    NEW.is_system_admin := true;
    NEW.is_active := true;
    NEW.deleted_at := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_system_admin AND NOT OLD.is_system_admin THEN
    IF NOT public.is_system_admin() AND NOT privileged_bootstrap THEN
      RAISE EXCEPTION 'Somente o administrador do sistema pode conceder privilégios de administrador';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.users DISABLE TRIGGER tr_protect_system_admin_user;

UPDATE public.settings
SET
  value = jsonb_build_object(
    'email', 'eliustecnologiace@gmail.com',
    'label', 'Elius Tecnologia'
  ),
  updated_at = NOW()
WHERE key = 'system_admin';

UPDATE public.users u
SET
  is_system_admin = false,
  updated_at = NOW()
WHERE u.is_system_admin = true
  AND lower(u.email) <> 'eliustecnologiace@gmail.com'
  AND u.deleted_at IS NULL;

UPDATE public.users u
SET
  is_system_admin = true,
  is_active = true,
  full_name = 'Elius Tecnologia',
  role_id = r.id,
  updated_at = NOW()
FROM public.roles r
WHERE r.name = 'gestor'
  AND lower(u.email) = 'eliustecnologiace@gmail.com'
  AND u.deleted_at IS NULL;

ALTER TABLE public.users ENABLE TRIGGER tr_protect_system_admin_user;

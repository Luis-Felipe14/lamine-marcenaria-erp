-- Ao criar usuário no Auth, aplicar perfil informado em user_metadata.role_name

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
  meta_role_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'role_name'), '');

  IF meta_role_name IS NOT NULL THEN
    SELECT id INTO target_role_id
    FROM public.roles
    WHERE name = meta_role_name
    LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles WHERE name = 'producao' LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    SELECT id INTO target_role_id FROM public.roles WHERE name = 'consulta' LIMIT 1;
  END IF;

  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'Perfil padrão não encontrado na tabela roles';
  END IF;

  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    target_role_id
  );

  RETURN NEW;
END;
$$;

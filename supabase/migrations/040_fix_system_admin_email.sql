-- Corrige o e-mail do administrador geral e promove o usuário já criado no Auth

UPDATE public.settings
SET
  value = jsonb_build_object(
    'email', 'eliustecnologiace@gmail.com',
    'label', 'Elius Tecnologia'
  ),
  updated_at = NOW()
WHERE key = 'system_admin';

-- Remove flag de quem foi promovido pelo e-mail antigo (se existir)
UPDATE public.users u
SET
  is_system_admin = false,
  updated_at = NOW()
FROM public.settings s
WHERE s.key = 'system_admin'
  AND u.is_system_admin = true
  AND lower(u.email) <> lower(s.value->>'email')
  AND u.deleted_at IS NULL;

-- Promove o usuário com o e-mail correto
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

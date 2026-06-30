-- Login por usuário (além de e-mail para gestores)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON public.users (username)
  WHERE username IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.users.username IS 'Usuário de acesso ao ERP (ex: ANTONIO E). E-mail interno no Auth.';

-- Usuários já criados com domínio interno
UPDATE public.users
SET username = upper(replace(split_part(email, '@', 1), '.', ' '))
WHERE email LIKE '%@login.lamine.internal'
  AND username IS NULL;

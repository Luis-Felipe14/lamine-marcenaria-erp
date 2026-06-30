-- Vínculo único entre colaborador e usuário de login

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id_unique
  ON public.employees (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.employees.user_id IS 'Usuário de login vinculado ao colaborador';

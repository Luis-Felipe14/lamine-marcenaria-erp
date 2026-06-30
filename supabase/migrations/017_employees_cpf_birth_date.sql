-- CPF e data de nascimento para funcionários

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_employees_birth_date
  ON public.employees (birth_date)
  WHERE deleted_at IS NULL AND birth_date IS NOT NULL AND is_active = TRUE;

COMMENT ON COLUMN public.employees.cpf IS 'CPF do colaborador';
COMMENT ON COLUMN public.employees.birth_date IS 'Data de nascimento para aniversários';

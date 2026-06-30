-- Vínculo de colaborador em despesas de salário + rótulo do perfil gestor

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id);

COMMENT ON COLUMN public.financial_transactions.employee_id IS 'Colaborador (despesas categoria salário)';

CREATE INDEX IF NOT EXISTS idx_financial_employee
  ON public.financial_transactions (employee_id)
  WHERE deleted_at IS NULL AND employee_id IS NOT NULL;

UPDATE public.roles
SET label = 'Proprietário', updated_at = NOW()
WHERE name = 'gestor';

-- Folha: horas por funcionário + recibos/adiantamentos (secretária)

DO $$ BEGIN
  CREATE TYPE time_entry_type AS ENUM ('producao', 'hora_extra');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.production_time_entries
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS entry_type time_entry_type NOT NULL DEFAULT 'producao';

ALTER TABLE public.production_time_entries
  ALTER COLUMN production_order_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_production_time_entries_employee_id
  ON public.production_time_entries (employee_id);

CREATE INDEX IF NOT EXISTS idx_production_time_entries_entry_date
  ON public.production_time_entries (entry_date);

CREATE INDEX IF NOT EXISTS idx_production_time_entries_type
  ON public.production_time_entries (entry_type);

-- Vincula apontamentos antigos ao funcionário via user_id
UPDATE public.production_time_entries pte
SET employee_id = e.id
FROM public.employees e
WHERE e.user_id = pte.user_id
  AND pte.employee_id IS NULL
  AND e.deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.employee_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_month DATE NOT NULL,
  receipt_type TEXT NOT NULL DEFAULT 'recibo'
    CHECK (receipt_type IN ('recibo', 'adiantamento')),
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employee_receipts_employee
  ON public.employee_receipts (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_receipts_month
  ON public.employee_receipts (reference_month);

COMMENT ON TABLE public.employee_receipts IS 'Recibos e adiantamentos pagos aos funcionários';
COMMENT ON COLUMN public.production_time_entries.employee_id IS 'Colaborador vinculado ao apontamento';
COMMENT ON COLUMN public.production_time_entries.entry_type IS 'producao = OP; hora_extra = lançamento manual';

ALTER TABLE public.employee_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_receipts authenticated" ON public.employee_receipts;
CREATE POLICY "employee_receipts authenticated"
  ON public.employee_receipts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Perfil secretária: acesso à folha
UPDATE public.roles
SET
  permissions = '[
    "dashboard.read","dashboard.operacional",
    "inventory.*","purchases.*","lumber_credit.*",
    "financial.*","employees.read","payroll.*",
    "orders.read","production.read",
    "reports.read","requests.read","notifications.read"
  ]'::jsonb,
  updated_at = NOW()
WHERE name = 'secretaria';

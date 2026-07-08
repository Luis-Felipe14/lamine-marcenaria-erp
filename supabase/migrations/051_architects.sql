-- Arquitetos parceiros — cadastro, vínculo com clientes/leads e base para comissões futuras

CREATE TABLE public.architects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  office TEXT,
  commission_rate NUMERIC(5,2),
  commission_type TEXT NOT NULL DEFAULT 'percent_sale'
    CHECK (commission_type IN ('percent_sale', 'fixed')),
  bank_info TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_architects_name ON public.architects(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_architects_active ON public.architects(is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER architects_updated_at
  BEFORE UPDATE ON public.architects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES public.architects(id);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES public.architects(id);

CREATE INDEX idx_clients_architect_id ON public.clients(architect_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_architect_id ON public.leads(architect_id) WHERE deleted_at IS NULL;

ALTER TABLE public.architects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth full access architects" ON public.architects;
CREATE POLICY "Auth full access architects"
  ON public.architects
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.architects IS 'Arquitetos parceiros — comissão pré-cadastrada para integração financeira futura';
COMMENT ON COLUMN public.architects.commission_rate IS 'Percentual (percent_sale) ou valor fixo por projeto (fixed)';
COMMENT ON COLUMN public.clients.architect_id IS 'Arquiteto responsável pelo cliente';
COMMENT ON COLUMN public.leads.architect_id IS 'Arquiteto indicado no lead';

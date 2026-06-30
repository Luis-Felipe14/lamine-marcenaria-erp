-- Crédito da Madereira — extrato de entradas (cartão) e saídas (materiais)

CREATE TYPE lumber_credit_movement_type AS ENUM ('entrada', 'saida');

CREATE TABLE lumberyard_credit_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_type lumber_credit_movement_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  material_id UUID REFERENCES materials(id),
  material_description TEXT,
  quantity DECIMAL(12,3),
  invoice_number TEXT,
  installment_number SMALLINT,
  installment_total SMALLINT,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lumber_credit_installment_check CHECK (
    (installment_number IS NULL AND installment_total IS NULL)
    OR (
      installment_number IS NOT NULL
      AND installment_total IS NOT NULL
      AND installment_number >= 1
      AND installment_total >= 1
      AND installment_number <= installment_total
    )
  )
);

CREATE INDEX idx_lumber_credit_date ON lumberyard_credit_movements(movement_date DESC);
CREATE INDEX idx_lumber_credit_client ON lumberyard_credit_movements(client_id);
CREATE INDEX idx_lumber_credit_type ON lumberyard_credit_movements(movement_type);

CREATE TRIGGER lumberyard_credit_movements_updated_at
  BEFORE UPDATE ON lumberyard_credit_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE lumberyard_credit_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lumberyard_credit select"
  ON public.lumberyard_credit_movements FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "lumberyard_credit write"
  ON public.lumberyard_credit_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role('administrador', 'gestor_geral', 'almoxarifado'));

CREATE POLICY "lumberyard_credit update"
  ON public.lumberyard_credit_movements FOR UPDATE TO authenticated
  USING (public.has_any_role('administrador', 'gestor_geral', 'almoxarifado'))
  WITH CHECK (public.has_any_role('administrador', 'gestor_geral', 'almoxarifado'));

COMMENT ON TABLE lumberyard_credit_movements IS 'Extrato do Crédito da Madereira — entradas via cartão e saídas por materiais';

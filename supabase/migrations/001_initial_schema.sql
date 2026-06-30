-- Laminê ERP | Marcenaria & Interiores
-- Schema inicial PostgreSQL / Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM (
  'administrador',
  'gestor_geral',
  'comercial',
  'marketing',
  'financeiro',
  'operacional',
  'almoxarifado',
  'consulta'
);

CREATE TYPE department_type AS ENUM (
  'operacional',
  'comercial',
  'marketing',
  'financeiro',
  'almoxarifado'
);

CREATE TYPE lead_status AS ENUM (
  'novo_lead',
  'primeiro_contato',
  'em_negociacao',
  'orcamento_enviado',
  'aguardando_resposta',
  'fechado',
  'perdido'
);

CREATE TYPE budget_status AS ENUM (
  'em_analise',
  'enviado',
  'aprovado',
  'reprovado',
  'convertido_pedido'
);

CREATE TYPE order_status AS ENUM (
  'projeto_desenvolvimento',
  'aguardando_material',
  'em_producao',
  'em_acabamento',
  'pronto_entrega',
  'em_montagem',
  'finalizado',
  'cancelado'
);

CREATE TYPE production_order_status AS ENUM (
  'aberta',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

CREATE TYPE material_category AS ENUM (
  'mdf',
  'ferragens',
  'parafusos',
  'cola',
  'fitas_borda',
  'puxadores',
  'acessorios',
  'escritorio',
  'outros'
);

CREATE TYPE stock_movement_type AS ENUM (
  'entrada',
  'saida',
  'transferencia',
  'ajuste',
  'baixa_automatica'
);

CREATE TYPE purchase_status AS ENUM (
  'solicitado',
  'comprado',
  'recebido',
  'cancelado'
);

CREATE TYPE financial_type AS ENUM (
  'receita',
  'despesa'
);

CREATE TYPE financial_category AS ENUM (
  'pedido',
  'pagamento',
  'sinal',
  'salario',
  'compra',
  'energia',
  'agua',
  'internet',
  'transporte',
  'marketing',
  'aluguel',
  'outros'
);

CREATE TYPE campaign_channel AS ENUM (
  'instagram',
  'facebook',
  'google',
  'whatsapp',
  'indicacao',
  'outros'
);

CREATE TYPE request_priority AS ENUM (
  'baixa',
  'media',
  'alta',
  'urgente'
);

CREATE TYPE request_status AS ENUM (
  'aberta',
  'em_andamento',
  'concluida',
  'cancelada'
);

CREATE TYPE notification_type AS ENUM (
  'estoque_baixo',
  'pedido_atrasado',
  'pedido_prazo',
  'conta_vencendo',
  'conta_vencida',
  'lead_sem_atendimento',
  'orcamento_aguardando',
  'geral'
);

-- ==================== CORE TABLES ====================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name user_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name department_type NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role_id UUID NOT NULL REFERENCES roles(id),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== CRM & CLIENTS ====================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  channel campaign_channel NOT NULL DEFAULT 'outros',
  investment DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  origin TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  responsible_id UUID REFERENCES users(id),
  estimated_value DECIMAL(12,2) DEFAULT 0,
  status lead_status NOT NULL DEFAULT 'novo_lead',
  notes TEXT,
  client_id UUID REFERENCES clients(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE lead_contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  contact_type TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== BUDGETS & ORDERS ====================

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  client_id UUID NOT NULL REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  environment TEXT,
  project_name TEXT NOT NULL,
  measurements TEXT,
  labor_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  materials_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  status budget_status NOT NULL DEFAULT 'em_analise',
  notes TEXT,
  responsible_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  material TEXT,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  client_id UUID NOT NULL REFERENCES clients(id),
  budget_id UUID REFERENCES budgets(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE,
  responsible_id UUID REFERENCES users(id),
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'projeto_desenvolvimento',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  order_id UUID NOT NULL REFERENCES orders(id),
  responsible_id UUID REFERENCES users(id),
  planned_materials JSONB DEFAULT '[]',
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status production_order_status NOT NULL DEFAULT 'aberta',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE production_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  hours DECIMAL(6,2) NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INVENTORY & PURCHASES ====================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category material_category NOT NULL DEFAULT 'outros',
  unit TEXT NOT NULL DEFAULT 'un',
  current_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id),
  movement_type stock_movement_type NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2),
  department_id UUID REFERENCES departments(id),
  order_id UUID REFERENCES orders(id),
  production_order_id UUID REFERENCES production_orders(id),
  responsible_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  supplier_id UUID REFERENCES suppliers(id),
  material_id UUID REFERENCES materials(id),
  description TEXT,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_number TEXT,
  status purchase_status NOT NULL DEFAULT 'solicitado',
  requested_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==================== FINANCIAL ====================

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type financial_type NOT NULL,
  category financial_category NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id),
  purchase_id UUID REFERENCES purchases(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==================== HR & INTERNAL ====================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  phone TEXT,
  salary DECIMAL(12,2),
  admission_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE internal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number SERIAL,
  requesting_department_id UUID NOT NULL REFERENCES departments(id),
  responsible_department_id UUID NOT NULL REFERENCES departments(id),
  priority request_priority NOT NULL DEFAULT 'media',
  status request_status NOT NULL DEFAULT 'aberta',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES internal_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type notification_type NOT NULL DEFAULT 'geral',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_responsible ON leads(responsible_id);
CREATE INDEX idx_budgets_status ON budgets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_deadline ON orders(deadline);
CREATE INDEX idx_materials_stock ON materials(current_stock, min_stock);
CREATE INDEX idx_financial_due ON financial_transactions(due_date, is_paid);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type IN ('entrada', 'ajuste') THEN
    UPDATE materials SET current_stock = current_stock + NEW.quantity WHERE id = NEW.material_id;
  ELSIF NEW.movement_type IN ('saida', 'baixa_automatica', 'transferencia') THEN
    UPDATE materials SET current_stock = current_stock - NEW.quantity WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_purchase_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recebido' AND OLD.status != 'recebido' AND NEW.material_id IS NOT NULL THEN
    INSERT INTO stock_movements (material_id, movement_type, quantity, unit_cost, responsible_id, notes)
    VALUES (NEW.material_id, 'entrada', NEW.quantity, NEW.unit_price, NEW.requested_by, 'Entrada automática - compra #' || NEW.number);
    NEW.received_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalculate_budget_total()
RETURNS TRIGGER AS $$
DECLARE
  items_total DECIMAL(12,2);
  budget_row budgets%ROWTYPE;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO items_total FROM budget_items WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id);
  SELECT * INTO budget_row FROM budgets WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
  UPDATE budgets SET
    materials_cost = items_total,
    total_value = items_total + budget_row.labor_cost - budget_row.discount
  WHERE id = budget_row.id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGERS ====================

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_leads_updated BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_budgets_updated BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_materials_updated BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_stock_movement AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION handle_stock_movement();
CREATE TRIGGER tr_purchase_received BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION handle_purchase_received();
CREATE TRIGGER tr_budget_items_total AFTER INSERT OR UPDATE OR DELETE ON budget_items FOR EACH ROW EXECUTE FUNCTION recalculate_budget_total();

-- ==================== SEED DATA ====================

INSERT INTO departments (name, label) VALUES
  ('operacional', 'Operacional'),
  ('comercial', 'Comercial / Vendas'),
  ('marketing', 'Marketing'),
  ('financeiro', 'Financeiro / Administrativo'),
  ('almoxarifado', 'Almoxarifado');

INSERT INTO roles (name, label, permissions) VALUES
  ('administrador', 'Administrador', '["*"]'),
  ('gestor_geral', 'Gestor Geral', '["dashboard.*","crm.*","clients.*","budgets.*","orders.*","production.*","inventory.*","purchases.*","financial.*","marketing.*","employees.*","reports.*","settings.read"]'),
  ('comercial', 'Comercial / Vendas', '["dashboard.comercial","crm.*","clients.*","budgets.*","orders.read","reports.comercial"]'),
  ('marketing', 'Marketing', '["dashboard.marketing","crm.read","marketing.*","reports.marketing"]'),
  ('financeiro', 'Financeiro / Administrativo', '["dashboard.financeiro","financial.*","purchases.*","clients.read","orders.read","reports.financial"]'),
  ('operacional', 'Operacional', '["dashboard.operacional","orders.*","production.*","inventory.read"]'),
  ('almoxarifado', 'Almoxarifado', '["dashboard.operacional","inventory.*","purchases.read"]'),
  ('consulta', 'Usuário Consulta', '["dashboard.read","*.read"]');

INSERT INTO settings (key, value) VALUES
  ('company', '{"name":"Laminê | Marcenaria & Interiores","document":"","phone":"","email":"","address":""}'),
  ('theme', '{"primary":"gold","mode":"dark"}');

-- ==================== RLS ====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Authenticated users read clients" ON clients FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users manage clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated budgets" ON budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated materials" ON materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated financial" ON financial_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "User notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "User update notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

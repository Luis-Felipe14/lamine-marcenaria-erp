-- Corrige 403 ao inserir em order_status_history (RLS ativo sem política de INSERT)
-- Execute no SQL Editor do Supabase se o status do pedido atualiza mas o histórico falha.

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth full access order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "Authenticated order status history" ON public.order_status_history;

CREATE POLICY "Authenticated order status history"
  ON public.order_status_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mesmas tabelas de histórico/contato (caso 005 tenha sido aplicada parcialmente)
ALTER TABLE public.lead_contact_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth full access lead_contact_history" ON public.lead_contact_history;
CREATE POLICY "Authenticated lead contact history"
  ON public.lead_contact_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth full access request_history" ON public.request_history;
CREATE POLICY "Authenticated request history"
  ON public.request_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

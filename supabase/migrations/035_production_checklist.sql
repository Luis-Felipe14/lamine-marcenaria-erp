-- Checklist de etapas na ordem de produção
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.production_orders.checklist IS 'Checklist da OP: [{ "id": "...", "label": "...", "done": false }]';

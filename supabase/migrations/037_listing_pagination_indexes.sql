-- Índices para paginação e filtros de marketing e solicitações

CREATE INDEX IF NOT EXISTS idx_campaigns_start_date
  ON public.campaigns (start_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_internal_requests_created
  ON public.internal_requests (created_at DESC);

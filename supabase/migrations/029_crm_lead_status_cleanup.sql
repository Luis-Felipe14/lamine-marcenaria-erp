-- Remove pipelines "Primeiro Contato" e "Aguardando Resposta" do funil

UPDATE public.leads
SET status = 'em_negociacao', updated_at = NOW()
WHERE status = 'primeiro_contato';

UPDATE public.leads
SET status = 'orcamento_enviado', updated_at = NOW()
WHERE status = 'aguardando_resposta';

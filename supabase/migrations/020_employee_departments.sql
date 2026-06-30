-- Mantém apenas os 3 setores ativos: Gestão, Secretária, Produção

UPDATE departments SET label = 'Gestão' WHERE name = 'gestao';
UPDATE departments SET label = 'Secretária' WHERE name = 'secretaria';
UPDATE departments SET label = 'Produção' WHERE name = 'operacional';

-- Funcionários ainda vinculados a setores antigos → remapear
UPDATE employees e SET department_id = d_gestao.id
FROM departments d_gestao, departments d_old
WHERE e.department_id = d_old.id
  AND d_gestao.name = 'gestao'
  AND d_old.name IN ('comercial', 'marketing', 'financeiro');

UPDATE employees e SET department_id = d_sec.id
FROM departments d_sec, departments d_old
WHERE e.department_id = d_old.id
  AND d_sec.name = 'secretaria'
  AND d_old.name = 'almoxarifado';

UPDATE employees e SET department_id = d_prod.id
FROM departments d_prod
WHERE e.department_id IS NULL
  AND d_prod.name = 'operacional';

-- Ocultar setores legados
UPDATE departments
SET deleted_at = NOW(), updated_at = NOW()
WHERE name IN ('comercial', 'marketing', 'financeiro', 'almoxarifado')
  AND deleted_at IS NULL;

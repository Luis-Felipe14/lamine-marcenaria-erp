-- Parte 1/2: novos valores de enum (deve ser commitado antes da parte 2)
-- No SQL Editor do Supabase: execute ESTE arquivo primeiro, depois 019_simplify_roles_apply.sql

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretaria';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'producao';

ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'gestao';
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'secretaria';

# Relatório de Auditoria — Laminê ERP
**Data:** Junho 2026

## Resumo Executivo

Auditoria completa do sistema com **correções aplicadas** em código e nova migration de segurança.

| Severidade | Encontrados | Corrigidos |
|------------|-------------|------------|
| Crítico    | 8           | 7          |
| Alto       | 14          | 12         |
| Médio      | 18          | 8          |

**Build de produção:** ✅ `npm run build` passa sem erros.

---

## Correções Aplicadas

### Backend / Supabase
- `dashboard.service.ts`: queries inválidas (`.not('status','in',...)`, `lte.min_stock`), erros silenciosos, `deleted_at` ausente
- `005_security_and_rls.sql`: RLS em tabelas faltantes, política de `users` para admins e joins, `settings` protegido

### Autenticação e Permissões
- Papéis comercial/marketing/financeiro/operacional agora veem **Dashboard** e **Relatórios**
- `ProtectedRoute` bloqueia usuários `is_active = false`
- Notificações integradas no `Header`

### Módulos
- **CRM**: erros em insert de histórico, navegação React Router, status no modal
- **Orçamentos**: validação, try/catch, pedido duplicado ao converter
- **Pedidos**: loading e erros de histórico
- **Produção**: filtro de pedidos, erros em apontamento
- **Estoque**: erros em movimentação
- **Financeiro**: resumo independente do filtro da tabela
- **Marketing**: ROI por campanha (não global)
- **Clientes**: busca em múltiplos campos, histórico sem soft-deleted
- **Funcionários/Solicitações**: FK vazia → null, validação de setores

### UI / Layout
- Padding do conteúdo principal (header não cobre botões)
- Select em dialogs: `z-index` 80
- Datas sem bug de timezone

### Infraestrutura
- `supabase-helpers.ts`: `throwIfError`, `emptyToNull`
- `api.ts`: busca configurável, soft delete opcional
- Build TypeScript corrigido

---

## Pendências (próxima fase)

| Item | Status |
|------|--------|
| Soft delete (CRM, clientes, orçamentos, pedidos, funcionários) | ✅ |
| Guards de rota por permissão (`PermissionRoute`) | ✅ |
| RLS granular por papel (funcionários, financeiro) | ✅ migration 007 |
| Kanban drag-and-drop (CRM + Pedidos) | ✅ |
| Edição de clientes/funcionários | ✅ |
| Code-splitting (`React.lazy` nas rotas) | ✅ |
| Fix 403 `order_status_history` | ✅ migration 006 |
| Deep link orçamento ← lead pré-preenchido | Parcial (abre dialog) |
| Busca global multi-módulo | Pendente |

---

## Ação Necessária no Supabase

Execute no SQL Editor (nesta ordem, se ainda não rodou):

```
005_security_and_rls.sql
006_fix_order_history_rls.sql
007_role_based_rls.sql
008_fix_production_rls.sql
```

- **006** — corrige 403 ao alterar status de pedidos (histórico)
- **008** — corrige 403 ao criar OP e apontamentos de produção

---

## Como Validar

```bash
npm run dev
```

Testar:
1. Login e dashboard sem erros 400 no console
2. Criar lead → histórico → orçamento
3. Converter orçamento (não duplicar pedido)
4. Movimentação de estoque
5. Lançamento financeiro + confirmar pagamento
6. Configurações → lista de usuários (como admin)

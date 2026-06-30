# Arquitetura — Laminê ERP

## Visão Geral

Monorepo frontend com backend BaaS (Supabase). Comunicação via `@supabase/supabase-js` com tipagem em `src/types/database.ts`.

```
┌─────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐ │
│  │ Modules │  │ Services │  │ Stores  │  │ Components│ │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └───────────┘ │
│       └────────────┴─────────────┘                      │
│                    Supabase Client                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Supabase (PostgreSQL + Auth + RLS)          │
└─────────────────────────────────────────────────────────┘
```

## Camadas

| Camada | Responsabilidade |
|--------|------------------|
| `modules/*` | Páginas e lógica de UI por domínio |
| `services/*` | Queries e agregações Supabase |
| `components/ui` | Design system (Shadcn pattern) |
| `components/shared` | DataTable, Kanban, StatCard |
| `lib/permissions` | RBAC por perfil |
| `stores` | Estado global (auth, UI/theme) |

## Fluxo de Dados

1. Usuário autentica via Supabase Auth
2. `useAuth` carrega perfil + role + departments
3. `ProtectedRoute` valida sessão
4. `Sidebar` filtra rotas por `hasPermission()`
5. Módulos chamam `services/api` ou Supabase direto
6. Triggers PostgreSQL automatizam estoque e totais

## Extensibilidade

- **API pública:** adicionar Edge Functions em `supabase/functions/`
- **WhatsApp/NF-e:** integradores em `src/integrations/`
- **Mobile:** reutilizar `services/` com React Native
- **BI:** views materializadas no PostgreSQL para Power BI

## Convenções

- Soft delete: coluna `deleted_at`
- Auditoria: tabela `audit_logs` (pronta para hook)
- IDs: UUID v4
- Moeda: BRL, `formatCurrency()`
- Datas: ISO no banco, `date-fns` na UI

# Laminê | Marcenaria & Interiores — ERP

Sistema web completo para gestão de marcenaria e móveis planejados.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Shadcn/UI (Radix), Lucide Icons
- **Backend:** Supabase (Auth + PostgreSQL)
- **Gráficos:** Recharts
- **Exportação:** jsPDF, xlsx

## Módulos

| Módulo | Funcionalidades |
|--------|-----------------|
| Dashboard | Executivo, Comercial, Operacional, Marketing, Financeiro |
| CRM | Funil Kanban, histórico de contatos, conversão |
| Clientes | Cadastro completo e histórico |
| Orçamentos | Itens, cálculo automático, PDF, conversão em pedido |
| Pedidos | Kanban, linha do tempo |
| Produção | OPs e apontamento de horas |
| Estoque | Entrada/saída, estoque mínimo, distribuição por setor |
| Compras | Fluxo com atualização automática de estoque |
| Financeiro | Receitas, despesas, contas a pagar/receber |
| Marketing | Campanhas e ROI |
| Funcionários | Cadastro por setor |
| Solicitações | Comunicação entre setores |
| Relatórios | Exportação PDF e Excel |
| Configurações | Empresa, usuários, categorias |

## Instalação

> **Importante:** Por estar em pasta do OneDrive, recomenda-se mover o projeto para `C:\dev\lamine-erp` ou pausar a sincronização durante `npm install`.

```bash
npm install
cp .env.example .env
# Edite .env com URL e chave do Supabase
npm run dev
```

## Configuração Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o SQL em `supabase/migrations/001_initial_schema.sql` no SQL Editor
3. Crie um usuário em **Authentication → Users**
4. Insira o perfil na tabela `users`:

```sql
INSERT INTO users (id, email, full_name, role_id)
SELECT
  'UUID-DO-USUARIO-AUTH',
  'admin@lamine.com',
  'Administrador',
  id
FROM roles WHERE name = 'administrador';
```

5. Copie **Project URL** e **anon key** para o arquivo `.env`

## Perfis e Permissões

- Administrador, Gestor Geral, Comercial, Marketing, Financeiro, Operacional, Almoxarifado, Consulta
- Permissões por módulo em `src/lib/permissions.ts`
- Sidebar exibe apenas módulos permitidos

## Identidade Visual

- Paleta: Preto, Dourado (#c9a227), Branco, Cinza escuro
- Dark mode padrão (alternável no header)
- Sidebar recolhível

## Arquitetura

```
src/
├── components/   # UI, layout, shared
├── modules/      # Páginas por domínio
├── services/     # API Supabase
├── hooks/        # useAuth
├── stores/       # Zustand (auth, UI)
├── lib/          # utils, permissions, export
└── types/        # TypeScript
```

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build produção
- `npm run preview` — preview do build
- `npm run deploy:cloudflare` — publica o `dist/` no Cloudflare Pages (requer Wrangler logado)

## Vídeo da tela de login (Supabase Storage)

O vídeo **não vai para o GitHub** (arquivo grande). Em **produção**, o app busca no bucket público `login-assets`; em **desenvolvimento**, usa `public/login/login-video.mp4`.

### Configuração (uma vez)

1. Aplique a migration `042_login_assets_storage.sql` no SQL Editor do Supabase
2. Envie o vídeo com nome fixo `login-video.mp4`:

**Painel Supabase:** Storage → `login-assets` → Upload

**Ou via script (CLI linkada ao projeto):**

```powershell
.\scripts\upload-login-video.ps1
```

URL gerada automaticamente:

`https://SEU-PROJETO.supabase.co/storage/v1/object/public/login-assets/login-video.mp4`

Override opcional no `.env` / Cloudflare: `VITE_LOGIN_VIDEO_URL` com essa URL completa.

## Deploy no Cloudflare Pages

O frontend é uma SPA estática (Vite + React). O backend continua no **Supabase** (banco, auth e edge functions).

### Pré-requisitos

1. Projeto Supabase em produção com **todas** as migrations aplicadas (`supabase/migrations/`)
2. Edge functions publicadas: `create-employee-login`, `delete-user`, `reset-user-password`
3. Conta no [Cloudflare](https://dash.cloudflare.com)
4. Domínio no Cloudflare (opcional; Pages fornece `*.pages.dev` gratuito)

### Opção A — Git (recomendado)

1. Envie o código para GitHub/GitLab
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Configuração do build:

| Campo | Valor |
|--------|--------|
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Deploy command** | `npx wrangler deploy --assets=./dist` |
| **Non-production branch deploy command** | `npx wrangler versions upload --assets=./dist` |
| **Node version** | `20` |

> Projeto no Cloudflare é **Workers** (não Pages clássico). O `wrangler.toml` publica `./dist` com roteamento SPA.

4. **Environment variables** (Production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Após o primeiro deploy, em **Custom domains** adicione o domínio (ex.: `erp.lamine.com.br`)

### Opção B — Deploy manual (Wrangler)

```bash
npm install
npm run build
npx wrangler login
npm run deploy:cloudflare
```

### Supabase (obrigatório após definir o domínio)

Em **Authentication → URL Configuration**:

- **Site URL:** `https://SEU-DOMINIO`
- **Redirect URLs:** `https://SEU-DOMINIO/**`

Isso é necessário para login e redefinição de senha (`/login/redefinir-senha`).

### Checklist pós-deploy

- [ ] Login com usuário administrador da Laminê
- [ ] Login com administrador geral (`eliustecnologiace@gmail.com`)
- [ ] Redefinição de senha por e-mail
- [ ] Criação de login de funcionário (edge function)

## Integrações Futuras

Arquitetura preparada para WhatsApp, NF-e, assinatura digital, mobile, BI/Power BI e API pública.

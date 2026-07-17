# FinApp — Sistema Financeiro Pessoal

Controle completo da vida financeira: contas, transações, parcelamentos, cartões com faturas, recorrências, orçamentos, metas e relatórios.

**Stack:** Next.js 15 · React 19 · TypeScript (strict) · TailwindCSS v4 · shadcn/ui · Supabase (PostgreSQL + Auth + Storage) · React Hook Form · Zod · TanStack Query · Recharts · Lucide · Vercel

> A arquitetura completa (decisões D1–D8, modelagem do banco, RLS, roadmap) está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md). O DER está em [`docs/DER.mermaid`](docs/DER.mermaid). O progresso é registrado em [`CHANGELOG.md`](CHANGELOG.md).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev                  # http://localhost:3000
```

## Setup único (uma vez, na sua conta)

**1. Repositório GitHub**

```bash
git add -A
git commit -m "chore: fase 0 — fundação"
git branch -M main
git remote add origin git@github.com:SEU-USUARIO/finapp.git
git push -u origin main
```

**2. Projeto Supabase** — em [supabase.com/dashboard](https://supabase.com/dashboard) crie um projeto (região `sa-east-1` / São Paulo). Depois, em _Settings → API_, copie `URL`, `anon key` e `service_role key` para o `.env.local`. Vincule a CLI ao projeto (necessário a partir da Fase 2, quando as migrations começam):

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
```

**3. Deploy na Vercel** — em [vercel.com/new](https://vercel.com/new) importe o repositório (framework Next.js é detectado automaticamente) e cadastre as variáveis de ambiente do `.env.example` — `SUPABASE_SERVICE_ROLE_KEY` **sem** o prefixo `NEXT_PUBLIC_` e marcada apenas para o ambiente de produção/preview do servidor. Cada push na `main` gera um deploy.

**4. Auth no painel do Supabase (necessário para a Fase 1 funcionar)** — no dashboard do projeto:

_Authentication → URL Configuration:_

- **Site URL:** `http://localhost:3000` (troque pela URL da Vercel quando for para produção — e atualize `NEXT_PUBLIC_SITE_URL` junto).
- **Redirect URLs:** adicione `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm` e, depois do deploy, as mesmas rotas na URL de produção (`https://SEU-APP.vercel.app/auth/callback` etc.).

_Authentication → Emails → Templates_ — troque o link dos templates para o fluxo `token_hash` (funciona em qualquer navegador/dispositivo, não só no que iniciou o cadastro):

- **Confirm signup** — substitua o `href` do botão por:

  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
  ```

- **Reset password** — substitua o `href` do botão por:

  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
  ```

> O e-mail padrão do Supabase (sem SMTP próprio) tem limite baixo de envio por hora — suficiente para desenvolvimento; SMTP próprio fica para quando/se for necessário.

## Scripts

| Script              | Faz                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                                                                            |
| `npm run build`     | Build de produção                                                                                 |
| `npm run lint`      | ESLint (`any` é erro)                                                                             |
| `npm run typecheck` | `tsc --noEmit`                                                                                    |
| `npm run format`    | Prettier (com ordenação de classes Tailwind)                                                      |
| `npm run db:types`  | Gera `src/types/database.ts` a partir do schema (após `supabase link`; usado da Fase 2 em diante) |

## Estrutura (resumo)

```
supabase/           config da CLI + migrations (Fase 2)
src/app/            rotas (App Router) — grupos (auth) e (app) chegam na Fase 1
src/components/     ui (shadcn) · layout · shared · charts
src/features/       um domínio por pasta: components, actions, queries, schemas, types
src/lib/            supabase clients · money · dates · action-result · utils
src/services/       lógica de domínio pura (faturas, parcelas, recorrência, export)
src/types/          database.ts (gerado) · domain.ts
docs/               ARQUITETURA.md · DER.mermaid
```

## Nota sobre componentes shadcn/ui

O projeto já está inicializado (`components.json`, tokens de tema em `globals.css`, `cn()` em `lib/utils.ts`, base **zinc**, dark como padrão). Novos componentes podem ser adicionados com `npx shadcn add <componente>` — nas fases seguintes, os componentes necessários já chegam versionados em `src/components/ui/`.

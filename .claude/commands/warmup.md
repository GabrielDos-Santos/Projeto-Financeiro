---
description: Aquece o contexto da sessão — carrega estado do projeto, convenções e pendências antes de começar a trabalhar
---

# Warmup — FinApp (Sistema Financeiro Pessoal)

Execute os passos abaixo **antes** de tocar em qualquer código. O objetivo é sair deste comando sabendo: o que o projeto é, em que fase está, o que mudou recentemente e quais regras não podem ser violadas.

## 1. Contexto fixo do projeto (não precisa reler arquivos para isto)

- **Produto:** controle financeiro pessoal/familiar — contas, transações, parcelamentos, cartões com faturas, recorrências, orçamentos, metas, empréstimos, relatórios, importação CSV, PWA e notificações push.
- **Stack:** Next.js 15 (App Router, Turbopack) · React 19 · TypeScript strict · TailwindCSS v4 · shadcn/ui · Supabase (Postgres + Auth + Storage, RLS como camada de segurança) · TanStack Query · React Hook Form + Zod · Recharts · Serwist (PWA) · web-push (VAPID) · Vercel (deploy + cron).
- **Idioma:** UI, rotas, docs e commits em **português**.
- **Arquitetura:** módulos por feature em `src/features/<feature>/` com anatomia padrão: `actions.ts` (Server Actions), `queries.ts` (leituras server-side), `schemas.ts` (Zod), `types.ts`, `components/`. Rotas em `src/app/(app)/` (autenticado) e `src/app/(auth)/` (público). Compartilhados em `src/components/{ui,shared,layout,charts}`, `src/lib/`, `src/hooks/`, `src/services/`.

## 2. Leia o estado vivo do projeto

1. **`CHANGELOG.md` — seção "Estado atual"** (primeiras ~60 linhas): diz a última fase concluída, a próxima planejada e pendências da conta do usuário. É a fonte da verdade sobre progresso.
2. **`git status` + `git log --oneline -10`**: veja o que está em andamento não commitado e o tema dos últimos commits.
3. Se a tarefa envolver **banco de dados**: liste `supabase/migrations/` para ver a numeração real antes de criar migration nova; os tipos gerados vivem em `src/types/database.ts` (`npm run db:types`).
4. Se a tarefa for de **arquitetura/expansão**: consulte `docs/ARQUITETURA.md` (decisões D1–D8, RLS, modelagem) e os `docs/ARQUITETURA-EXPANSAO*.md` do tema correspondente (empréstimos, histórico, push).

## 3. Regras que não podem ser violadas

- **Decisões fechadas:** o CHANGELOG mantém uma lista de "Decisões já fechadas (não reabrir sem necessidade)" — não reabra sem o usuário pedir.
- **Segurança:** RLS protege os dados; a `anon key` é pública por design. `SUPABASE_SERVICE_ROLE_KEY` **nunca** com prefixo `NEXT_PUBLIC_` e só onde estritamente necessário. Chave VAPID privada e `CRON_SECRET` só no servidor.
- **Qualidade antes de concluir:** `npm run lint` + `npm run typecheck` + `npm run build` verdes — é o critério de pronto usado nas fases anteriores.
- **Ao fechar uma fase/entrega:** atualizar o `CHANGELOG.md` (estado atual + decisões numeradas novas).

## 4. Saída esperada do warmup

Responda ao usuário com um resumo curto contendo: última fase concluída, estado do working tree (arquivos modificados/untracked relevantes), e o que você entendeu que é o próximo trabalho — então aguarde ou prossiga com a tarefa pedida.

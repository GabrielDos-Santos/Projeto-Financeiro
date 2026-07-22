---
description: Cria uma tela/rota nova (numa feature existente ou nova) seguindo os padrões do projeto
argument-hint: o que a tela deve mostrar e onde ela deve aparecer (ex. "tela de detalhe do empréstimo ao clicar no card")
---

Crie uma tela nova no FinApp seguindo a anatomia de `src/features/` e as decisões fechadas do `CHANGELOG.md`.

Pedido do usuário: $ARGUMENTS

## Antes de escrever qualquer código

1. **Descubra a qual feature a tela pertence** (`src/features/`: accounts, auth, budgets, cards, categories, dashboard, goals, households, import, installments, loans, notifications, push, recurring, reports, settings, transactions). Se pertencer a uma feature que não existe, avise o usuário que o caminho certo é `/nova-feature` e pergunte se quer seguir por lá.
2. Se o pedido não deixar claro **o que a tela mostra, de onde vêm os dados e como o usuário chega nela**, PERGUNTE antes. Não invente requisitos.
3. Confira se os dados já existem em `queries.ts` da feature. Se a tela precisa de coluna/tabela que não existe, isso é migration — trate primeiro (veja `/nova-feature`, passo 1).

## Passos

1. **A rota** vive em `src/app/(app)/<rota-em-portugues>/page.tsx` — Server Component `async`, com `export const metadata: Metadata = { title: "..." }`. Rota com parâmetro usa pasta dinâmica (`src/app/(app)/emprestimos/[id]/page.tsx`), e em Next 15 **`params` é uma Promise** — precisa de `await`.
   Rotas em `(app)/` são autenticadas pelo middleware; `(auth)/` é público — só use `(auth)/` se o usuário pedir explicitamente.
2. **A página busca os dados na própria rota** (Server Component), chamando as funções de `src/features/<feature>/queries.ts`. Consultas independentes vão juntas em `Promise.all`. Se algum dado é pessoal do usuário mesmo dentro de uma família (contas, categorias, cartões nos seletores), filtre por `user_id` explicitamente — a RLS estendida da família deixaria o admin ver o dos membros (decisão 96).
3. **O componente da tela** vive em `src/features/<feature>/components/`. Server Component por padrão; `"use client"` só no pedaço que tem interação (decisão 8). Monte com `PageHeader` de `@/components/layout/page-header` e reuse `@/components/ui` (shadcn) + `@/components/shared` (`MoneyDisplay`, `StatCard`, `DatePicker`, `MonthNav`, `ConfirmDialog`…) antes de criar UI nova.
4. **Estados sempre tratados:** vazio → `EmptyState` (com ícone, título e uma ação sugerida); carregando → `loading.tsx` da rota ou `Skeleton` de `@/components/ui/skeleton`; erro → mensagem legível, nunca tela em branco nem stack na cara do usuário.
5. **Se a tela escreve dados**, a escrita é uma Server Action em `actions.ts` da feature (`safeParse` → `ok`/`fail` → `revalidatePath`), nunca escrita direta do client.
6. **Navegação:** `Link` do `next/link`. Se a tela merece item no menu, adicione em `src/components/layout/nav-items.ts` (fonte única do `app-sidebar.tsx` e do `mobile-nav.tsx`) — e, se fizer sentido, na `command-palette.tsx` (busca ⌘K).
7. **Responsivo desde o começo** (Fase 15): teste mentalmente em ~390 px — tabela larga vira lista/card no mobile, nada de scroll horizontal na página.

## Guardrails

- Rota fina em lógica de apresentação: `page.tsx` busca dados e compõe; a UI de verdade mora em `src/features/<feature>/components/`.
- **Dinheiro em centavos** (`MoneyDisplay`/`src/lib/money.ts`), **datas como string `"YYYY-MM-DD"`** (`src/lib/dates.ts`, nunca `new Date("YYYY-MM-DD")`).
- Ícones/cores só dos registros fechados `DOMAIN_ICONS`/`DOMAIN_COLORS` (decisão 26).
- Texto de UI **sempre em pt-BR**; rota em português.
- Nunca instale dependência nova sem confirmar com o usuário.

## Ao terminar

Rode `npm run typecheck && npm run lint && npm run build` até ficar tudo verde. Relate em linguagem simples o que foi criado, em quais arquivos, e o passo a passo para ver a tela no navegador (`npm run dev` + URL).

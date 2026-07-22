---
description: Cria uma feature completa seguindo a anatomia padrão do projeto (schemas → queries → actions → componentes → rota)
argument-hint: nome da feature e o que ela deve fazer (ex. "assinaturas: listar, criar e cancelar assinaturas recorrentes com nome, valor e dia de cobrança")
---

Crie uma feature nova no FinApp seguindo a anatomia padrão de `src/features/` e as decisões fechadas do `CHANGELOG.md`.

Pedido do usuário: $ARGUMENTS

## Antes de escrever qualquer código

1. Se o pedido não deixar claro (a) o nome da feature, (b) os campos/dados envolvidos e (c) as operações necessárias (listar? criar? editar? excluir?), PERGUNTE ao usuário. Não invente requisitos.
2. **Releia uma feature existente como referência.** `src/features/loans/` é a menor completa (5 arquivos, cobre criar/editar/excluir + rollback). `src/features/transactions/` é a mais rica (paginação keyset + TanStack Query). Copie a estrutura delas, não invente outra.
3. **Descubra se precisa de banco.** Se a feature guarda dados novos, ela precisa de migration + RLS ANTES do código. Liste `supabase/migrations/` para pegar o próximo número real da sequência.
4. Nome da feature em kebab-case e **em inglês** na pasta (`src/features/loans`), mas a **rota e toda a UI em português** (`/emprestimos`).

## Passos (na ordem)

1. **Migration** (só se houver dados novos) — `supabase/migrations/NNNN_<nome>.sql` com o próximo número. Obrigatório em toda tabela nova:
   - `user_id uuid not null references auth.users(id) on delete cascade`
   - `alter table ... enable row level security` + policies de `select/insert/update/delete` usando **`(select auth.uid())`** (decisão 23), não `auth.uid()` direto
   - **`grant select, insert, update, delete on <tabela> to authenticated`** — sem isso toda query falha com `42501`, mesmo com a policy certa (decisão 24)
   - Dinheiro em `bigint` (centavos), datas de competência em `date`
   Depois: avise o usuário para rodar `npx supabase db push` e então `npm run db:types`. **Não rode `db push` você mesmo** — é o banco de produção dele.
2. **`schemas.ts`** — schemas Zod (zod 4) + tipos com `z.infer`. Valores de enum vêm de `Constants.public.Enums` do `src/types/database.ts` (decisão 25) — nunca redigite a lista à mão. Dinheiro entra como centavos (`z.number().int()`), data como `z.string()` no formato `"YYYY-MM-DD"`.
3. **`types.ts`** — tipos da feature e tipos de "option" usados pelos seletores; derive de `Database["public"]["Tables"][...]` quando for espelho de tabela.
4. **`queries.ts`** — leituras server-side. Usa `createClient()` de `@/lib/supabase/server`. Sem `"use server"` no topo (não são actions). Deixe a RLS filtrar; filtre por `user_id` explicitamente quando o dado for pessoal mesmo dentro de uma família (decisão 96 — seletores de conta/categoria são sempre do próprio usuário).
5. **`actions.ts`** — Server Actions. Padrão obrigatório, igual ao `src/features/loans/actions.ts`:
   - `"use server"` no topo
   - `schema.safeParse(input)` → se falhar, `fail("Dados inválidos. Revise os campos.", z.flattenError(parsed.error).fieldErrors)`
   - checar sessão: sem usuário → `fail("Sessão expirada. Entre novamente.")`
   - retorno sempre `ActionResult<T>` via `ok()` / `fail()` de `@/lib/action-result` — nunca lançar erro cru nem vazar SQL/stack
   - `update`/`delete` com `{ count: "exact" }` para detectar id inexistente ou alheio (a RLS zera o count) e devolver "não encontrado" em vez de sucesso falso (decisão 28)
   - `revalidatePath()` de toda rota afetada no fim
6. **`components/`** — Server Components por padrão; `"use client"` só onde há interação (decisão 8). Formulários com React Hook Form + `zodResolver` do mesmo schema; erros de campo aplicados com `applyFieldErrors` de `@/lib/form`. Reuse `@/components/ui` (shadcn) e `@/components/shared` (`MoneyInput`, `MoneyDisplay`, `DatePicker`, `ConfirmDialog`, `EmptyState`, `StatCard`…) antes de criar UI nova.
7. **Rota** — `src/app/(app)/<rota-em-portugues>/page.tsx`: Server Component `async` que exporta `metadata`, busca os dados com as `queries` (em `Promise.all` quando forem independentes) e monta a tela com `PageHeader` + `EmptyState` para os estados vazios. Rotas em `(app)/` são autenticadas; `(auth)/` é público — só use `(auth)/` se o usuário pedir explicitamente.
8. **Navegação** — se a feature tem página própria, adicione o item em `src/components/layout/nav-items.ts` (fonte única consumida por `app-sidebar.tsx` e `mobile-nav.tsx`). Considere também registrar a ação na `command-palette.tsx` (busca ⌘K).
9. **Lógica pura** — cálculo sem I/O (parcelas, juros, projeções) vai em `src/services/`, testável e reusável pelo client E pela action (como `buildInstallmentPlan`).

## Guardrails (não negocie)

- **Dinheiro sempre em `BIGINT` de centavos** (decisão 1) — nunca `float`, nunca `number` com decimal. Conversões só via `src/lib/money.ts`.
- **Datas como string `"YYYY-MM-DD"`** de ponta a ponta (decisão 30) — conversão só em `src/lib/dates.ts`. NUNCA `new Date("YYYY-MM-DD")`.
- **Toda mutação passa por Server Action validada com Zod** (decisão 8) — nunca escreva no Supabase direto de um componente client.
- **RLS é a segurança, não a UI.** Toda tabela nova com RLS + grants. `SUPABASE_SERVICE_ROLE_KEY` nunca com prefixo `NEXT_PUBLIC_` e só onde for estritamente necessário.
- **Nunca edite `src/types/database.ts`** (é gerado) nem uma migration já aplicada.
- Ícones e cores vêm dos registros fechados `DOMAIN_ICONS`/`DOMAIN_COLORS` de `@/components/shared/domain-icon.tsx` (decisão 26) — nada de renderizar nome de ícone arbitrário vindo do banco.
- Texto de UI **sempre em pt-BR**.
- NUNCA instale dependências novas sem confirmar com o usuário.

## Ao terminar

Rode `npm run typecheck && npm run lint && npm run build` e corrija até ficar verde. Só então relate ao usuário, em linguagem simples: o que foi criado e em quais arquivos, o roteiro de teste manual (`npm run dev` + URL da página, passo a passo), e — se criou migration — o lembrete de rodar `npx supabase db push` + `npm run db:types`. Se a entrega fecha uma fase, atualize o `CHANGELOG.md`.

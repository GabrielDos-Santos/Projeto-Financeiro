# CHANGELOG.md — Sistema Financeiro Pessoal

> Este arquivo é o registro de progresso do projeto. Cole-o (junto com `docs/ARQUITETURA.md` e `docs/DER.mermaid`) no início de qualquer nova sessão de IA — ele diz exatamente onde o projeto parou.

---

## Estado atual

**Roadmap MVP (Fases 0–14) completo + expansão em andamento.** Última fase concluída: **Fase 15 — Mobile/PWA** (19/07/26; lint + typecheck + build verdes, 26 rotas). Manifest + Serwist (service worker), ícones do app, fallback offline, prompt de instalação, e Dialog/tabela de transações/barra de filtros responsivos no mobile (decisões 74–80).
**Próxima fase:** **Fase 16 — Família** (`docs/ARQUITETURA-EXPANSAO.md`) — única fase pendente do roadmap combinado com o usuário (decisão 55); é a que mexe em RLS, por isso ficou por último.
**Já resolvido pelo usuário:** repositório no GitHub ✅ · projeto Supabase criado (região São Paulo) ✅ · `.env.local` preenchido ✅ · app rodando localmente ✅ · Fases 0 e 1 no ar ✅ · **Fase 2 aplicada** (`npx supabase db push` + `npm run db:types` — `src/types/database.ts` gerado e commitado) ✅.
**Pendências de conta do usuário:**

1. **Aplicar as migrations `0010`, `0011`, `0012` e `0013`**: `npx supabase db push`. `0010`/`0011` **não** mudam colunas — não precisam de `npm run db:types`. **`0012` (Fase 17) muda colunas e cria tabela** (`affects_balance`, `import_batches`, `import_batch_id`, `import_hash`) e **`0013`** adiciona `credit_cards.invoice_name_by_due_month` (decisão 68) — **rodar `npm run db:types` depois do push** e conferir que bate com o `src/types/database.ts` hand-patched nestas sessões. `0010` evita dupla contagem do pagamento de fatura nos relatórios (decisão 34). `0011` concede `execute` de `generate_recurring_transactions()` ao `service_role` — sem ela o botão "Gerar agora" falha com _permission denied_ (ver decisão 38).
2. Configurar Auth no painel do Supabase — Site URL, Redirect URLs e os 2 templates de e-mail com `token_hash` (passo 4 do `README.md`). Depende de SMTP customizado (o SMTP padrão limita a 2 e-mails/hora — ver Fase 1).
3. Importar o repositório na Vercel com as variáveis de ambiente (deploy).
4. **Reverter o rate limit de import de 50/h para 10/h** (decisão 58/73) em `importAccountEntries`/`importCardEntries` (`src/features/import/actions.ts`) — foi elevado temporariamente só para o backfill inicial deste usuário.
5. **Fase 15 (PWA/mobile) — validação com app publicado**: Lighthouse (critério de pronto do PWA) e teste em dispositivo real (Android Chrome + iOS Safari) — instalar, abrir standalone, testar o fallback offline (modo avião) e conferir os 6 itens do checklist responsivo em ~390 px. Exige deploy/HTTPS real, fora do alcance desta sessão (mesmo padrão da Fase 14 com Lighthouse/RLS).

---

## O que já existe

| Arquivo                                                                                                                           | Conteúdo                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ARQUITETURA.md`                                                                                                             | Documento completo de arquitetura (aprovado): decisões D1–D8, modelagem (13 tabelas + enums + views + funções + RLS), auth, páginas, componentes, segurança, performance, roadmap 0–14                                                  |
| `docs/DER.mermaid`                                                                                                                | Diagrama entidade-relacionamento completo                                                                                                                                                                                               |
| Projeto (raiz do repo)                                                                                                            | **Roadmap completo (0–14)**: auth/shell, Contas/Categorias, Transações/anexos/parcelas, Cartões, Recorrentes, Dashboard, Orçamentos, Metas, Relatórios, Busca ⌘K, Configurações, Polimento                                              |
| `supabase/migrations/0001…0009_*.sql`                                                                                             | Fase 2 — banco completo (14 tabelas, RLS, views, funções, storage, cron, grants). **Aplicadas no projeto real** via `db push`                                                                                                           |
| `supabase/migrations/0010_*.sql`                                                                                                  | Fase 6 — recria `v_monthly_summary`/`v_budget_usage` excluindo o pagamento de fatura (anti-dupla-contagem). **Pende `db push`** (só views, sem regen de tipos)                                                                          |
| `supabase/migrations/0011_*.sql`                                                                                                  | Fase 7 — `grant execute` de `generate_recurring_transactions()` ao `service_role` (habilita "Gerar agora"). **Pende `db push`** (só grant, sem regen de tipos)                                                                          |
| `supabase/migrations/0012_*.sql`                                                                                                  | Fase 17 — `affects_balance` em `transactions`/`transaction_installments`, tabela `import_batches` + `import_batch_id`/`import_hash`, `v_entries`/`v_account_balances` recriadas. **Pende `db push` + `db:types`** (muda colunas/tabela) |
| `supabase/migrations/0013_*.sql`                                                                                                  | Fase 17 (ajuste) — `credit_cards.invoice_name_by_due_month` (decisão 68): rótulo cosmético da fatura por mês de vencimento (Sicredi e afins), nenhum cálculo muda. **Pende `db push` + `db:types`** (muda coluna)                       |
| `supabase/tests/smoke_fase2.sql`                                                                                                  | Smoke test da Fase 2 — **somente banco local/de estudo** (insere em `auth.users`); nunca rodar no projeto real                                                                                                                          |
| `src/types/database.ts`                                                                                                           | Tipos gerados por `npm run db:types` — tabelas, views, enums e `Constants` (fonte dos enums no Zod)                                                                                                                                     |
| Todas as decisões de arquitetura foram **revisadas e aprovadas** pelo usuário. Não replanejar do zero — continuar a partir delas. |

---

## Decisões já fechadas (não reabrir sem necessidade)

1. Dinheiro sempre em `BIGINT` de centavos (nunca float).
2. Saldo de conta é **derivado** das transações pagas (não armazenado).
3. Transferência = par espelhado de transações (`transfer_group_id`).
4. Parcelamento = 1 transação-mãe + N linhas em `transaction_installments`.
5. Cartão de crédito: relatórios/orçamentos por **competência** (data da compra), saldo de conta por **caixa** (data do pagamento da fatura).
6. Recorrências materializadas por job diário (`pg_cron`), idempotente.
7. RLS habilitada em 100% das tabelas + Storage.
8. Server Components por padrão; TanStack Query nas superfícies interativas (lista de transações com infinite scroll); mutações sempre via Server Actions validadas com Zod.
9. _(Fase 0)_ Base de cor do shadcn: **zinc**, dark como tema padrão (classe `dark` no `<html>`; ThemeProvider na Fase 1, preferência por usuário na Fase 13).
10. _(Fase 0)_ `npm run build` sem Turbopack (estável na Vercel); Turbopack apenas no `dev`.
11. _(Fase 0)_ Fontes Geist via pacote npm `geist` (self-hosted pela Vercel), em vez de `next/font/google` — build reprodutível, sem fetch de rede em build-time.
12. _(Fase 1)_ Feature `auth` adicionada a `src/features/` (13ª pasta) — mesmo padrão feature-based das demais; schemas Zod são a fonte única de validação (client + Server Action).
13. _(Fase 1)_ Tema claro/escuro persistido em **cookie** (`theme`) aplicado por script inline antes da hidratação — sem `localStorage`, sem flash (ARQUITETURA.md §9); CSP para esse script entra na Fase 14.
14. _(Fase 1)_ Confirmação de e-mail e reset de senha pelo fluxo `token_hash` (`/auth/confirm` + `verifyOtp`) — exige os templates de e-mail do passo 4 do README; `/auth/callback` (PKCE) mantido como rota complementar.
15. _(Fase 1)_ `/redefinir-senha` fica FORA do redirect "logado → dashboard" do middleware: a página exige a sessão de recuperação criada pelo link do e-mail.
16. _(Fase 1)_ zod 4: `z.email()` valida o formato ANTES de transforms encadeados — padrão do projeto: `z.string().trim().toLowerCase().pipe(z.email(…))`; erros de campo via `z.flattenError(err).fieldErrors`.
17. _(Fase 2)_ Coluna de intervalo das recorrências chama-se **`interval_count`** (o DER dizia `interval` — palavra reservada no Postgres e péssima de ler dentro de SQL que também usa o tipo `interval`).
18. _(Fase 2)_ Novo enum **`transfer_direction`** (`in`/`out`) + coluna em `transactions`: o par espelhado (D3) não tinha como distinguir a perna de saída da de entrada — lacuna do DER. CHECKs garantem a forma: transferência → grupo + direção, sem categoria, nunca em cartão; não-transferência → sem grupo/direção.
19. _(Fase 2)_ O `0008` virou **storage + backfill + cron** (no plano era `seed_defaults`): o seed de categorias vive em `create_default_categories()`, chamada pelo trigger `handle_new_user` no signup. O **backfill** do 0008 cria profile/settings/categorias para usuários que **já existiam** em `auth.users` (contas de teste da Fase 1) — sem isso o app quebraria para elas a partir da Fase 3.
20. _(Fase 2)_ Gerador de recorrências **ancorado no `start_date`**: a k-ésima ocorrência é sempre calculada da âncora (mensal criada dia 31 rende 31/01, 29/02, 31/03… sem "drift" para o dia 28). `SECURITY DEFINER` com EXECUTE revogado de `anon`/`authenticated` — só o job (pg_cron às `0 6 * * *` UTC = 03:00 de Brasília) e o service role executam.
21. _(Fase 2)_ `rate_limits`: RLS ligada **sem nenhuma policy** + REVOKE explícito (tabela e sequence) — o acesso é exclusivamente via `check_rate_limit()` (`SECURITY DEFINER`); assim o próprio usuário não consegue ler nem apagar os registros do seu limite.
22. _(Fase 2)_ Compra em cartão é obrigatoriamente `type='expense'` **com** `invoice_id` (estorno/crédito em fatura fica como evolução futura); toda transação tem **exatamente um dono** — conta OU cartão (`num_nonnulls(account_id, credit_card_id) = 1`).
23. _(Fase 2)_ Views com **`security_invoker = on`** (a RLS do usuário atravessa as views) e policies com **`(select auth.uid())`** em vez de `auth.uid()` direto (o Postgres cacheia o valor por statement — initplan).
24. _(Fase 2, correção 17/07/26)_ Nova migration **`0009_grants.sql`**: RLS filtra linhas, mas o acesso à tabela em si (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) é um privilégio Postgres separado, concedido via `GRANT` — projetos Supabase mais recentes não concedem isso automaticamente para tabelas novas. Sem essa migration, toda query como `authenticated` falha com `permission denied for table X` mesmo com a policy correta. Detectado pelo próprio usuário rodando o teste de aceite de RLS do `APLICAR.md` (`categories`: 42501). `rate_limits` continua **sem** grant a `authenticated`, de propósito (decisão 21).
25. _(Fase 3)_ Clients Supabase tipados com o **`Database` gerado** (`createBrowserClient<Database>` / `createServerClient<Database>`) e enums do Zod vindos de **`Constants.public.Enums`** do `database.ts` — o schema do banco é a fonte única dos tipos e dos valores válidos (nunca duplicar listas de enum à mão).
26. _(Fase 3)_ Ícones de contas/categorias são um **registro fechado** (`DOMAIN_ICONS` em `components/shared/domain-icon.tsx`, nomes kebab-case do Lucide, com fallback seguro) e cores uma **paleta fechada** (`DOMAIN_COLORS`) — ambos incluem os 14 ícones/cores usados por `create_default_categories()` (migration 0006). Nada de renderizar nome de ícone arbitrário vindo do banco.
27. _(Fase 3)_ O **tipo** da categoria (receita/despesa) não muda na edição — lançamentos e orçamentos existentes assumem o tipo original. Exclusão de conta/categoria é real só sem histórico: o `ON DELETE RESTRICT` (23503) vira mensagem "em uso — arquive"; nome duplicado (23505) vira erro de campo no formulário.
28. _(Fase 3)_ `applyFieldErrors` movido de `features/auth/components/form-helpers.ts` para **`src/lib/form.ts`** (uso por todas as features; o arquivo antigo só re-exporta). Server Actions de update/delete usam `{ count: "exact" }` para detectar id inexistente/alheio (RLS zera o count) e devolver "não encontrada" em vez de sucesso falso.
29. _(Fase 4)_ Par espelhado da transferência criado num **único INSERT com 2 linhas** (atômico); status/exclusão de transferência operam sempre **pelo `transfer_group_id`** (o par inteiro). Na edição, os campos espelhados atualizam num statement único pelo grupo e as contas de cada perna em seguida (out = origem, in = destino) — se a 2ª parte falhar, o erro pede para conferir e salvar de novo (janela mínima, sem RPC extra no banco).
30. _(Fase 4)_ Datas de competência trafegam como **string "YYYY-MM-DD"** de ponta a ponta; conversão string ⇄ `Date` só em `src/lib/dates.ts` (`parse`/`format` locais do date-fns — nunca `new Date("YYYY-MM-DD")`, que desloca o dia por UTC). Paginação da lista é **keyset por `(date desc, id desc)`** sobre `v_entries`, com fetcher isomórfico (`fetchEntriesPage` recebe o client): o RSC entrega a primeira página como `initialData` e o TanStack Query pagina o resto (D8/§10).
31. _(Fase 4)_ Ações da Fase 4 protegem invariantes das fases seguintes: `updateTransaction` só toca lançamentos simples (`.is("transfer_group_id", null)` + `.eq("is_installment_parent", false)`); compra em cartão fica de fora do form até a Fase 6 (schema exige `accountId`). Editar/duplicar transferência busca o par no client (uma linha de `v_entries` é só UMA perna). `react-day-picker` fixado na **v9** (API do calendar shadcn; a v10 saiu há pouco e quebraria o componente).
32. _(Fase 5)_ A compra-mãe nasce (e permanece) com `status = 'pending'` — o status dela é **irrelevante para o saldo**: a mãe fica fora de `v_entries`, e quem move caixa é **cada parcela paga** (a `v_account_balances` soma sobre `v_entries`). Vencimentos ancorados no `firstDueDate` (`addMonths(âncora, k)` — 31/01 → 28/02 e 31/03, sem drift), plano gerado por `buildInstallmentPlan()` em `services/installments.ts` (puro; usado pelo preview no client E pela Server Action). Mãe + parcelas em 2 statements com **rollback da mãe** se as parcelas falharem (sem parcelas ela ficaria invisível).
33. _(Fase 5)_ Parcela na lista: status individual via `setInstallmentStatus` (tabela `transaction_installments`); **sem** editar/duplicar (edição de compra parcelada é evolução futura); "Excluir" numa parcela exclui a **compra inteira** (mãe + todas as parcelas, via cascade), com aviso explícito no ConfirmDialog. Parcelamento só na **criação de despesa em conta** (cartão parcelado entra na Fase 6; receita parcelada fora do MVP).
34. _(Fase 6)_ **Pagamento de fatura vs. dupla contagem.** Pagar fatura cria uma despesa `expense` na conta (debita caixa, D5) — o CHECK `transactions_category_required` obriga uma categoria, escolhida no diálogo. Como as compras do cartão já contam nos relatórios por **competência**, a despesa de pagamento **não pode** contar de novo. A migration **`0010`** recria `v_monthly_summary` e `v_budget_usage` excluindo as transações cujo id está em `credit_card_invoices.payment_transaction_id`. `v_account_balances` **não** muda (o pagamento debita a conta) e a despesa continua visível em `/transacoes`. Migration só de views → sem regen de tipos.
35. _(Fase 6)_ Compra no cartão = `expense` + `credit_card_id` + `invoice_id` (via RPC `get_or_create_invoice`, upsert idempotente), `account_id` nulo, **nasce `pending`**; o pagamento da fatura propaga `paid` para as compras à vista (`transactions where invoice_id = X and not is_installment_parent`) e parcelas (`transaction_installments where invoice_id = X`). Parcelado no cartão: mãe na fatura do mês da compra + cada parcela na fatura do **seu** mês (`invoice_id` próprio, `due_date` = vencimento daquela fatura). Preview client usa `services/invoices.ts` (`computeInvoicePeriod`, espelho do SQL) só para exibir — a verdade é o RPC na action.
36. _(Fase 6)_ Itens de cartão na lista de transações (`credit_card_id != null`) são **travados**: sem editar/duplicar (editar pelo fluxo de conta violaria "um dono só") e sem troca manual de status (governado pelo pagamento da fatura) — só exclusão. Pagar fatura tem **rollback** da despesa se a quitação falhar; `reopenInvoice` desfaz um pagamento (apaga a despesa, volta itens a pendente, fatura → `closed`). Limite disponível computado de `v_invoice_totals` (open+closed) em vez de N chamadas ao RPC `get_card_available_limit`.
37. _(Fase 7; revisto após teste do usuário)_ **Cursor na criação = `start_date`** (não "primeira ocorrência futura"). O usuário criou "Salário, mensal, início 06/07" e esperava o lançamento de 06/07 mesmo já sendo 17/07 — a regra anterior (pular o passado) frustrava isso. Agora `next_run_date = start_date` na criação e na edição de agenda, e o gerador faz o catch-up da âncora até hoje (idempotente, D6). `start_date` é a âncora do cálculo (mensal dia 31 → 29/02, 31/03… sem drift). **Retomar** ainda re-ancora para a próxima ocorrência de hoje em diante (`firstRunOnOrAfter`), pulando o período pausado — comportamento desejado ali. Edição só mexe no cursor se início/frequência/intervalo mudaram. `services/recurrence.ts` espelha `advance_occurrence()` só para preview/cursor; a materialização é 100% SQL. Verificado com casos concretos (drift, bissexto, salto analítico daily/weekly).
38. _(Fase 7)_ **"Gerar agora"** reusa a MESMA função SQL do cron (`generate_recurring_transactions`) via **service role** (`lib/supabase/admin.ts`) — reimplementar no app arriscaria divergir do job (idempotência e avanço de cursor). A função tem `EXECUTE` revogado de `public/anon/authenticated` na 0006 e **precisava** de grant explícito ao `service_role` (a 0006 não fazia isso → o botão falhava com _permission denied_): corrigido na **migration `0011`**. É global (roda para todos), aceitável no MVP single-user; exige `getUser` para disparar e degrada com aviso se `SUPABASE_SERVICE_ROLE_KEY` não estiver setada. Recorrência = sempre income/expense com **categoria obrigatória** e **um dono** (conta OU cartão; cartão só despesa). Excluir o template usa `ON DELETE SET NULL` — os lançamentos já gerados permanecem, só perdem o vínculo.
39. _(Fase 8)_ **Saldo previsto por CAIXA, sem dupla contagem.** A fórmula do §4.3 foi refinada para não recontar gasto de cartão: previsto = saldo atual + receitas pendentes do mês **em conta** − despesas pendentes do mês **em conta** (inclui parcelas em conta, que carregam o `account_id` da mãe em `v_entries`) − faturas não pagas com vencimento no mês. Compras no cartão (`account_id` nulo) entram só pela fatura. Os "gastos por categoria" do dashboard também excluem os pagamentos de fatura (mesma regra da 0010, aplicada na query). Gráficos: Recharts em componentes `"use client"` sob `components/charts/` (split por rota); receita = emerald, despesa = rose (consistente com `MoneyDisplay`); donut usa a **cor da própria categoria** (cor segue a entidade). Dashboard é RSC com **Suspense por seção** (§10) — cada painel busca os próprios dados e streama independente.
40. _(Fase 8)_ **"Saldo em contas"** soma só contas **não arquivadas** (consistente com a tela `/contas`). Metas ficaram **fora** do dashboard por ora (tabela existe, mas sem CRUD até a Fase 10) — o widget de metas entra junto com a feature. Build: `.next` corrompeu o cache uma vez ("Cannot find module for page" em páginas que existem) — resolvido com `rm -rf .next` + rebuild; não é erro de código.
41. _(Fase 9)_ **Alerta é melhor-esforço e idempotente por orçamento/mês.** `maybeBudgetAlert()` roda dentro das Server Actions que criam despesa (`createTransaction`, `createInstallmentPurchase` — só a 1ª parcela, `createCardPurchase`, `createCardInstallmentPurchase`) **depois** do INSERT confirmado, e nunca falha a action (try/catch engolido) — um erro no alerta não pode impedir o lançamento. Idempotência: antes de inserir a `notification`, verifica se já existe uma `type='budget_alert'` com `metadata @> {budget_id, month}` — sem isso, editar/reabrir lançamentos no mesmo mês notificaria de novo. `usage_ratio`/`spent_cents`/`alert_reached` vêm prontos de `v_budget_usage` (já exclui pagamento de fatura, decisão 34/39) — a Action só lê a view, nunca recalcula soma. Edição/exclusão de lançamento **não** dispara o alerta (só criação) — reduzir gasto não precisa avisar, e o escopo do MVP não cobre reavaliação em update.
42. _(Fase 9)_ Orçamento é **um por (categoria, mês)** — constraint do banco; a Action de criar só oferece categorias **sem** orçamento naquele mês (`availableCategories`), e o 23505 ainda vira erro de campo por defesa em profundidade. Editar não muda categoria/mês (só teto e threshold) — trocar categoria seria outro orçamento. `MonthNav` é local (não faz round-trip ao servidor): a `BudgetsView` troca de mês via TanStack Query direto no client (`v_budget_usage` filtrada), com a página RSC entregando só o mês atual como `initialData`. Central de notificações: sino na Topbar com contagem de não lidas, "marcar como lida" ao clicar num item e "marcar todas"; sem realtime (Supabase Realtime é evolução futura) — atualiza ao abrir o popover.
43. _(Fase 10)_ **Sem histórico de aportes no MVP** (`goal_contributions` é evolução futura — ARQUITETURA.md §4.2): `contributeToGoal()` só soma em `current_amount_cents`. Ao cruzar `target_amount_cents`, o `status` vira `completed` **de forma irreversível pela action de aportar** (não regride) — isso por si só garante a notificação `goal_reached` nunca duplicar, sem precisar checar `metadata` como no alerta de orçamento (decisão 41): a transição `active → completed` só acontece uma vez. Aportar exige `status = 'active'` (metas concluídas/arquivadas não recebem aporte — devolve erro). Projeção (`services/goals.ts`) é **simples**: `(alvo − atual) / meses restantes` a partir de hoje até `target_date`; não usa histórico de aportes (não existe) para estimar ritmo real.
44. _(Fase 10)_ `GoalProgressRadial` (Recharts) é anel de **uma única série** — sem legenda (§6, "uma série não precisa de legenda"), com o percentual no centro. Progresso na UI é sempre travado em 100% mesmo se o aporte superar o alvo (o banco permite `current > target`, sem CHECK) — evita barra/anel vazando visualmente. `setGoalArchived` só alterna `active ⇄ archived` (`neq("status", "completed")` na query) — meta concluída não se arquiva por ali; sem RESTRICT em `goals`, excluir é sempre permitido (sem histórico de aportes vinculado por FK).
45. _(Fase 11)_ **Export sempre no servidor** (Route Handler `GET /api/export`), nunca no client: os dados nunca são serializados para o browser antes de virar arquivo — nem via Server Action (que serializaria o resultado pro client de qualquer forma), daí a escolha de Route Handler puro. `services/export/{csv,xlsx,pdf}.ts` são **genéricos** (`buildTableCsv/Xlsx/Pdf(headers, rows)`), não um por domínio — o Route Handler monta `headers`/`rows` conforme o relatório (mensal = lançamentos; anual = 12 meses) e reusa os 3 builders; evita 6 funções quase-duplicadas. `pdfmake` 0.3.x **não** é a API clássica `new PdfPrinter(fonts)` — é um **singleton** (`import pdfMake from "pdfmake"`) configurado uma vez no módulo (`setFonts`/`setLocalAccessPolicy`/`setUrlAccessPolicy`) com `createPdf(doc).getBuffer()`. Fontes Roboto lidas de `node_modules/pdfmake/fonts/Roboto/*.ttf` (suportam acentuação pt-BR) — **verificado gerando um PDF real**, não só nos tipos, porque a API mudou entre versões do pacote e o `@types/pdfmake` instalado é a única fonte de verdade dos tipos (pdfmake não publica os próprios).
46. _(Fase 11)_ **`setLocalAccessPolicy` valida CADA leitura de arquivo local do pdfmake — inclusive as fontes que ele mesmo carrega.** Negar tudo (`() => false`) quebra a geração (nem as fontes carregam); a policy correta restringe ao diretório de fontes (`path.resolve(filePath).startsWith(FONTS_DIR)`) — permite só o necessário, nega imagens/anexos locais arbitrários (não usados nos relatórios). `setUrlAccessPolicy(() => false)` sem ressalvas (nenhum relatório busca recurso remoto). Rate limit do export via RPC `check_rate_limit()` (20/hora por usuário) — já tinha `grant execute` para `authenticated` desde a Fase 2 (diferente do bug da 0006/`generate_recurring_transactions`, decisão 38); não precisou de migration nova. CSV leva **BOM UTF-8** (`﻿`) para o Excel abrir acentos certos sem prompt de encoding.
47. _(Fase 12)_ **Sem embedding de FK em views no PostgREST.** A busca do Command Palette lê `v_entries` e precisa do ícone/cor da categoria — tentar `select("...,categories:category_id(icon,color)")` sobre uma **view** falharia (PostgREST só embeda relacionamentos com FK visível no catálogo; views não expõem isso mesmo quando a coluna aponta pra uma FK real na tabela de origem). Resolvido com 2 queries em paralelo (`v_entries` + `categories` completo) e um `Map` de junção no client — mesmo padrão já usado em `dashboard/queries.ts` e `reports/queries.ts`.
48. _(Fase 12)_ **Command Palette é global e vive fora da árvore de estado do layout** (`(app)/layout.tsx` é Server Component). O botão de busca da Topbar não tem como chamar `setOpen` do `CommandPalette` (componentes irmãos, sem estado compartilhado subido) — em vez de reestruturar o layout, o gatilho é um `CustomEvent` no `window` (`COMMAND_PALETTE_OPEN_EVENT`): a Topbar dispara, o `CommandPalette` escuta, junto do atalho de teclado `Ctrl/Cmd+K`. "Novo lançamento" navega para `/transacoes?novo=1`; a `TransactionsView` lê esse parâmetro num `useEffect`, abre o drawer e limpa a URL com `router.replace` (não fica no histórico do navegador).
49. _(Fase 12, correção 18/07/26)_ **`cmdk` filtra os itens por conta própria por padrão** (fuzzy match do texto digitado contra a prop `value` de cada `CommandItem`), além do filtro que eu já fazia via query no Supabase — os dois brigavam. Como usei `value={`entry-${entry.id}`}` (um uuid, sem relação com o texto buscado), o filtro embutido escondia o resultado certo e podia deixar visível um item de uma renderização anterior — reportado pelo usuário como "busca mostra valor errado, sem relação com o termo digitado". Corrigido com **`shouldFilter={false}`** no `<Command>` (`components/ui/command.tsx`): quem decide o que aparece na lista é sempre quem monta os `CommandItem` (a busca no Supabase ou os itens estáticos de navegação) — nunca o cmdk por cima.
50. _(Fase 13)_ **Excluir conta não depende de FK cascade para o Storage.** `auth.users` apaga tudo em `public.*` via `on delete cascade` (Fases 2–12 inteiras contam com isso), mas o bucket `attachments` não tem FK — os arquivos ficariam órfãos. `deleteAllUserAttachments()` lista o prefixo `userId/` (1 nível: pastas por `transaction_id`), lista o conteúdo de cada uma e remove tudo antes de chamar `admin.auth.admin.deleteUser()`. Ordem importa: Storage primeiro (a policy de leitura ainda depende do usuário existir/RLS válido durante a listagem via service role — na prática service role ignora RLS, mas a ordem "limpar dependências externas antes do cascade do banco" é a mais segura de qualquer forma). `deleteAccount` termina com `redirect("/login")` — igual ao `signOut()` da Fase 1, nunca retorna `ActionResult` no caminho de sucesso.
51. _(Fase 13)_ **Alterar senha logado exige reautenticação** (ARQUITETURA.md §6): `changePassword()` chama `signInWithPassword(email, senhaAtual)` antes do `updateUser({password})` — se a senha atual estiver errada, o erro vira campo (`currentPassword`), nunca genérico. Perfil sincroniza **dois lugares** ao salvar o nome: a tabela `profiles` (fonte de verdade do domínio) e `user_metadata.full_name` via `auth.updateUser()` — só a tabela não bastaria porque a Topbar/`UserMenu` leem o nome do metadata do JWT (decisão da Fase 1), não de `profiles`, para evitar 1 query extra em todo request.
52. _(Fase 13)_ **`refine` com comparação de igualdade pode inferir um type predicate sem pedir.** `deleteAccountSchema` originalmente tinha `.refine((v) => v === "EXCLUIR", …)` — o TypeScript 5.5+ **infere automaticamente** um predicate `v is "EXCLUIR"` de uma arrow function cujo corpo é `v === literal`, e o zod usa esse predicate para estreitar o tipo de saída ao literal `"EXCLUIR"` (em vez de `string`) — quebra o resolver do RHF, cujo `defaultValues` usa `""`. Mesma categoria de armadilha do `.transform()` na Fase 7/10 (decisões 37/43), causa diferente: aqui é inferência de predicate, não transform explícito. Corrigido anotando o retorno como `(v): boolean => …` — a anotação explícita desliga a inferência automática. Moral: **qualquer callback de `.refine`/`.transform` que "parece" um type guard merece anotação de tipo explícita**, não só transforms.
53. _(Fase 14)_ **CSP pragmática, sem nonce.** `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` só em dev, para o react-refresh): os scripts inline do próprio Next (hydration/streaming) e o script de tema da Fase 1 exigem inline; a alternativa correta (nonce por request via middleware) tornaria **todas** as páginas dinâmicas e é evolução futura. Mesmo assim a CSP fecha o que importa no MVP: `connect-src` restrito ao próprio app + URL do Supabase (lida da env em build, fallback `*.supabase.co`), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`. `img-src` inclui `https:` de propósito — o avatar da Fase 13 é uma URL externa arbitrária. `style-src 'unsafe-inline'` é obrigatório pelos atributos `style={}` (cores dinâmicas de categoria/conta/gráfico). Headers extras: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` negando camera/mic/geo.
54. _(Fase 14)_ **Um `loading.tsx` no nível do grupo `(app)`** cobre a navegação para TODAS as rotas do grupo (nenhuma tinha fallback próprio) — 1 arquivo em vez de 11; o dashboard mantém os `<Suspense>` internos por seção. `React.memo` na `EntryRow` da lista de transações — com infinite scroll, cada página nova re-renderizava todas as linhas anteriores; exigiu `useCallback` nos handlers da `TransactionsView` (inline arrows quebrariam o memo). Rate limit de upload de anexos: 60/hora via `check_rate_limit` (fecha a lista do §9: login/reset = nativo Supabase; export/backup/upload = RPC). Auditoria de a11y: todos os 19 botões só-ícone têm `aria-label`; `aria-current` na navegação; ícones decorativos com `aria-hidden` — sem pendências. **Lighthouse e o re-teste de RLS com 2 usuários (APLICAR.md) ficam para o usuário** — exigem app rodando/deployado e duas contas reais.
55. _(Fase 17, expansão)_ **Prioridade pós-MVP: Fase 17 (onboarding com histórico) → Fase 15 (PWA) → Fase 16 (Família)**, combinada com o usuário — 17 corrige um bloqueio de uso real (sem backfill, ninguém com vida financeira pré-existente adota o app com saldo correto); 15/16 agregam valor sobre um app já utilizável. As decisões 25–30 do `docs/ARQUITETURA-EXPANSAO.md` colidem em número com as 25–30 reais deste changelog (Fases 3–14 continuaram a contagem sem incorporá-las) — a numeração das Fases 15/16 será renumerada para o próximo bloco livre (66+) quando implementadas.
56. _(Fase 17)_ **`affects_balance boolean not null default true`** em **`transactions` E `transaction_installments`** (migration `0012`) — quem move caixa é cada linha de `v_entries` (mãe fica fora, decisão 32), então um parcelamento em andamento precisa da flag por parcela, não só na mãe. `v_account_balances` (recriada) e o saldo previsto (`dashboard/queries.ts`, filtro `.eq("affects_balance", true)` na query de pendentes) respeitam a flag; `v_entries` (recriada) só expõe a coluna; `v_monthly_summary`/`v_budget_usage`/`v_invoice_totals` **ignoram** — histórico conta nos relatórios por competência, só não dobra o saldo. Armadilha de novo: `z.boolean().default(true)` no schema quebra `Control<T>` do RHF (mesma categoria das decisões 37/43/52 — divergência input/output) — corrigido com `z.boolean()` puro e `affectsBalance: true` explícito em **todo** `defaultValues`.
57. _(Fase 17)_ **Fork B2**: fatura histórica é paga com a MESMA transação de pagamento de sempre (`payInvoice`), só com `affects_balance = false` — `payment_transaction_id` continua **sempre** preenchido em fatura paga, preservando a invariante que `reopenInvoice` (decisão 36) e a exclusão anti-dupla-contagem da `0010` (decisão 34) já assumiam. Diálogo "Pagar fatura" ganhou o checkbox invertido "Pagamento histórico" (default desmarcado — pagar atrasado é normal e deve debitar), com hint quando `reference_month` é anterior ao mês corrente. Estado "fatura histórica" é **derivado**: `getCardInvoices()` faz join por `payment_transaction_id → transactions.affects_balance` (sem coluna nova em `credit_card_invoices`), exposto como `InvoiceWithHistory.paymentIsHistorical` e badge na timeline.
58. _(Fase 17)_ Import CSV em lote (`src/services/import/*`, `src/features/import/*`): parse **no client** com `papaparse` (o arquivo nunca sobe cru — só linhas mapeadas vão na Server Action), até 500 linhas / 1 MB, encoding UTF-8 com fallback latin1. **Um contexto por sessão** — conta OU cartão+competência. Mapeamento de colunas por índice (sem assumir cabeçalho): data (3 formatos), descrição, valor (3 modos: sinal único, débito/crédito, valor+tipo D/C), separador decimal. Insert de confirmação **atômico em statement único**; rate limit próprio `:import` (10/h) via `check_rate_limit`.
59. _(Fase 17)_ Categoria continua **obrigatória** na revisão do import: sugestão por palavra-chave contra o histórico do próprio usuário (`services/import/category-suggestion.ts` — índice palavra→categoria dos últimos 300 lançamentos categorizados, votação simples, sem categoria-sistema oculta) + "categoria padrão da sessão" aplicada em massa às linhas sem sugestão. Tabela de revisão (`ReviewTable`) é **estado React simples, não RHF** — sidesteps de propósito a armadilha do resolver (decisão 56/37/43/52): 500 linhas editáveis não precisam de validação por campo em tempo real.
60. _(Fase 17)_ Dedup **não-bloqueante**: `import_hash` (sha-256 de `contexto|data|valor|descrição normalizada`, `services/import/hash.ts`), índice não-único — linha sinalizada nasce **desmarcada** na revisão (`analyzeImportRows`, que também casa contra lançamentos manuais mesmo contexto+data+valor sem `import_batch_id`), nunca bloqueada; duplicata legítima (duas tarifas iguais no mesmo dia) continua importável ao marcar manualmente.
61. _(Fase 17)_ `import_batches` (RLS own rows) + `transactions.import_batch_id`/`import_hash` → **"Desfazer importação"** (`undoImport`) apaga as transações do lote e o lote; bloqueado se a fatura destino do lote foi paga **depois** do import (reabrir primeiro). Hub `/transacoes/importar` lista os últimos 10 lotes (`getRecentImportBatches`) com o botão, sem janela de expiração.
62. _(Fase 17)_ Reconstrução de compra parcelada em andamento (`createInstallmentBackfillPurchase`/`createCardInstallmentBackfillPurchase`, `features/transactions/actions.ts`) reusa `buildInstallmentPlan()`/`splitInstallments()` — nada duplicado do motor de parcelamento das Fases 5/6. Parcelas `1..paidCount` nascem `paid` + `affects_balance=false`; `paidCount+1..N` ficam `pending` + `true` (normais). No cartão, as faturas passadas tocadas são fechadas como pagas via `settleInvoiceHistorically()` (mesma mecânica do `payInvoice`, mas com `paid_at` no vencimento da fatura em vez de "agora" — helper próprio, **não** uma alteração do `payInvoice` existente, para não arriscar regressão no fluxo de pagamento do dia a dia) — evita fatura antiga `open` consumindo limite disponível para sempre.
63. _(Fase 17)_ Import e reconstrução de parcelamento **não chamam `maybeBudgetAlert` por linha** (evita rajada de notificações de meses mortos) — reconciliação única pós-confirmação, só se alguma linha/parcela cair no **mês corrente**, reusando a idempotência por `(budget_id, month)` da decisão 41. Meses passados nunca notificam.
64. _(Fase 17)_ Defaults da flag: dia a dia = `true` sem fricção (checkbox "Lançamento histórico" fica dentro de uma seção "Avançado" colapsada no drawer, decisão 56); import de conta = corte por data escolhida no passo de contexto do wizard (default = hoje — linhas do CSV, por serem históricas por natureza, nascem `affects_balance=false` até a data de corte); diálogo de pagar fatura = default "afeta o saldo" **sempre**.
65. _(Fase 17)_ **Simplificação consciente de escopo**: o passo final do import de fatura de cartão ("esta fatura já foi paga?") não embute o `PayInvoiceDialog` dentro do wizard — em vez disso, leva o usuário para `/cartoes/[id]`, onde o diálogo de pagamento (já com o checkbox histórico da decisão 57) está pronto para uso. Evita duplicar a lógica de pagamento em dois lugares por uma economia de um clique. OFX, perfis de mapeamento salvos e regras persistentes de categorização ficam fora da v1 (evoluções já mapeadas no `docs/ARQUITETURA-EXPANSAO-HISTORICO.md`).
66. _(Fase 17, ajuste 18/07/26)_ **Paginação de `/transacoes` migrada de keyset + infinite scroll (decisão 30) para offset numerado** com tamanho de página configurável (25/50/75/100, padrão 25) — pedido do usuário por navegação por página em vez de rolagem contínua. `fetchEntriesPage` passou a usar `.range()` + `count: "exact"` sobre `v_entries`; `useEntries` trocou `useInfiniteQuery` por `useQuery` com `keepPreviousData` (sem flash ao trocar página/tamanho). **Supera a decisão 30 e a nota de performance do §10** ("keyset... O(1) vs offset") — aceitável no volume de um usuário único; se o app ganhar mais volume/multiusuário (Fase 16), keyset volta a ser a escolha certa.
67. _(Fase 17, ajuste 18/07/26)_ Seleção em massa de lançamentos + exclusão em lote: `deleteEntries` reusa o mesmo núcleo de `deleteEntry` (`performEntryDelete`, resolve transferência pelo grupo inteiro — decisão 29). Checkbox por linha + "selecionar todos (desta página)" na tabela, barra de ação com contagem + `ConfirmDialog` na view. Seleção **não sobrevive** a troca de página/filtro/tamanho — evita excluir por engano algo que saiu da tela.
68. _(Fase 17, ajuste 19/07/26)_ **`credit_cards.invoice_name_by_due_month`** (migration `0013`) — alguns bancos (confirmado com o Sicredi: fecha dia 25, vence dia 10) nomeiam a fatura pelo mês de **vencimento**, não de competência. Flag por cartão, default `false`, **puramente cosmética** — não muda `reference_month` nem nenhum cálculo de `compute_invoice_period`; só o rótulo lido em `payInvoice` (descrição do pagamento) e exibido na `InvoiceTimeline`. Estado derivado a cada leitura (join `credit_cards.invoice_name_by_due_month`), sem duplicar dado.
69. _(Fase 17, correção 19/07/26)_ **Import de fatura de cartão ia para o mês seguinte ao escolhido, em cartões com a flag da decisão 68 ligada.** Causa: o seletor do wizard pedia a **competência**, mas o usuário — vendo as faturas já rotuladas pelo mês de vencimento em `/cartoes/[id]` — escolhia o mês olhando para esse rótulo. Resultado: escolher "novembro" gravava a competência certa, mas a fatura aparecia rotulada "dezembro" (vencimento), parecendo que o import pulara um mês. Corrigido com dois helpers puros em `services/invoices.ts` — `invoiceLabelMonth` (competência → rótulo exibido) e `resolveReferenceMonthForLabel` (inversa: rótulo escolhido → competência real, testando os dois meses candidatos em vez de supor "sempre -1 mês") — o seletor do wizard agora opera no mesmo espaço de rótulo que a tela do cartão.
70. _(Fase 17, ajuste 19/07/26)_ **Sugestão de categoria (decisão 59) tinha dois bugs reportados pelo usuário.** (a) "parcela"/"parc" dominava o índice em qualquer fatura parcelada e a sugestão virava sempre a mesma categoria genérica — corrigido removendo o sufixo de parcelamento antes de tokenizar e ampliando a stoplist com boilerplate de extrato (Pix, nomes de banco, "fatura", "cartão"…) e tokens só-numéricos (fragmentos de CNPJ/agência/conta). (b) mesmo fora da stoplist, uma palavra comum a várias categorias elegia sempre a categoria mais frequente do histórico (ex.: posto de gasolina sugerido como "Alimentação") — corrigido trocando voto por contagem bruta por voto **ponderado pela concentração** da palavra na categoria (`count/total`): uma palavra exclusiva de uma categoria pesa muito mais que uma espalhada por várias.
71. _(Fase 17, ajuste 19/07/26)_ Categoria agora é editável **inline mesmo em itens "travados"** (compra/parcela de cartão — decisões 33/36) via nova `updateEntryCategory` — o único campo seguro de liberar sem violar "um dono só" ou o vínculo com a fatura. Usado na tabela de transações (para consertar categoria errada vinda de import) além do já existente na revisão do wizard.
72. _(Fase 17, ajuste 19/07/26)_ Robustez do parser de CSV, tudo a partir de bugs reais reportados pelo usuário: `isRealDate()` rejeita datas inexistentes (31/02, 31/04…) que passavam na regex antiga e derrubavam o INSERT atômico inteiro; `fixDoubleEncodedUtf8()` corrige mojibake ("Ã§Ã£o") de CSVs que já chegam com UTF-8 salvo como Latin-1 na origem (visto num extrato do Nubank); `IMPORT_DESCRIPTION_MAX` subiu de 120 para 300 (Pix traz razão social + CNPJ + banco + agência/conta e estourava o limite antigo sem dizer o motivo); `mapCsvRows` passou a receber o `context` ("account" | "card") porque o modo "valor com sinal" tem semântica **invertida** entre os dois — extrato: positivo = receita; fatura: positivo = compra — sem isso, importar uma fatura nesse modo descartava as compras e aceitava pagamentos/estornos como despesa. `validateRowCategories` (nova guarda server-side) bloqueia categoria de tipo errado (receita numa linha de despesa ou vice-versa) na confirmação, já que o CHECK do banco não cruza categoria×tipo.
73. _(Fase 17, ajuste 19/07/26)_ Rate limit de import elevado **temporariamente para 50/h** (era 10/h, decisão 58) só para o backfill inicial deste usuário (histórico de várias faturas) — **pendência**: reverter para 10/h depois do primeiro uso real (ver "Estado atual", item 4).
74. _(Fase 15)_ **Dialog vira tela cheia no mobile via CSS, sem componente Sheet paralelo.** A `ARQUITETURA-EXPANSAO.md` sugeria "sheet/drawer (ex.: vaul), mantendo Dialog no desktop"; em vez de duplicar cada um dos 10 diálogos de formulário num wrapper Dialog-ou-Sheet (`useMediaQuery` + dois conjuntos de sub-componentes, com o problema extra de `DialogContent` ter padding único `p-6` enquanto `SheetContent` exige um `<div>` de padding à parte pro corpo), o `DialogContent` compartilhado (`components/ui/dialog.tsx`) ganhou classes responsivas: abaixo do `sm` ele é `fixed inset-0` (tela cheia, sem cantos arredondados, rolagem própria); a partir do `sm` volta a ser o modal centralizado de sempre. Mesmo resultado visual, uma única mudança em um arquivo compartilhado, zero dependência nova (`vaul`), e todo diálogo futuro herda o comportamento automaticamente. Os 2 diálogos com `className` próprio (`import-wizard.tsx`, `import-hub.tsx`, `recurring-form-dialog.tsx`) tiveram as classes de altura/largura prefixadas com `sm:` para não brigar com o tela-cheia do mobile.
75. _(Fase 15)_ Botão só-ícone (`size="icon"` do `Button` compartilhado) passou de `size-9` (36 px) fixo para **`size-11 sm:size-9`** (44 px no mobile, 36 px a partir do sm) — alvo de toque mínimo recomendado (checklist da Fase 15), numa única mudança que cobre as ~21 ocorrências do app (Topbar, cards de conta/orçamento/meta, menu de ações da tabela de transações etc.) sem tocar cada call site. O botão "..." da tabela de transações (que já sobrescrevia o tamanho para `size-8`) virou `size-11 sm:size-8` explicitamente.
76. _(Fase 15)_ **Tabela de transações ganha visão em cards abaixo do `sm`** — 8 colunas (seleção, data, descrição, categoria, conta/cartão, status, valor, ações) não cabem em ~375 px sem rolagem horizontal. A lógica de negócio (mudar status, editar categoria inline em item travado — decisão 71 —, excluir com confirmação) foi extraída pra um hook `useEntryRowState` e dois componentes compartilhados (`EntryCategoryField`, `EntryActionsMenu`), consumidos tanto por `EntryRow` (`<table>`, ≥ sm) quanto pelo novo `EntryCard` (lista de cards, < sm) — nada de regra duplicada entre os dois layouts. `TransactionsTable` renderiza os dois (classes `hidden sm:table` / `sm:hidden`); "selecionar todos" ganhou uma versão compacta acima da lista de cards.
77. _(Fase 15)_ **Barra de filtros de `/transacoes` colapsável no mobile.** Os 6 selects/datas (tipo, status, conta, categoria, período) mais o botão "Limpar" não cabem numa linha em ~375 px sem empilhar várias linhas de altura. O campo de busca (o mais usado) continua sempre visível; o resto fica atrás de um botão "Filtros" (`sm:hidden`, com badge de contagem de filtros ativos) que abre/fecha um estado local `filtersOpen` — a partir do `sm` os filtros voltam a aparecer todos inline como sempre (classe `hidden sm:flex` no container).
78. _(Fase 15)_ **PWA via Serwist** (`serwist` + `@serwist/next`, package escolhido pela própria `ARQUITETURA-EXPANSAO.md` como sucessor do Workbox pro Next): `src/app/manifest.ts` (Next 15 metadata API), `src/app/sw.ts` (precache dos assets + fallback offline via `PrecacheFallbackPlugin`/`fallbacks`, desligado em dev — o precache brigaria com o hot-reload do Turbopack), `src/app/offline/page.tsx` (rota estática, adicionada ao precache manualmente via `additionalPrecacheEntries` porque não é um arquivo de `public/` e o Serwist não sabe emiti-la sozinha). Ícones (192/512 "any" + 192/512 "maskable" + 180 apple-touch-icon) gerados por um script Node autocontido que escreve PNG bruto (chunks IHDR/IDAT/IEND + CRC32 na mão, `zlib.deflateSync` pros pixels) — evita puxar uma dependência de processamento de imagem só pra um ícone provisório (moeda emerald sobre fundo zinc-900, mesma paleta do tema dark e da cor de valor positivo — decisão 39). CSP ganhou `worker-src 'self'`.
79. _(Fase 15)_ `src/app/sw.ts` **excluído do `tsconfig.json` principal** (`exclude`) + `/// <reference lib="webworker" />` só nele — o service worker roda no global `ServiceWorkerGlobalScope`, que conflita com o `lib: ["dom", ...]` do resto do projeto (mesmo `self`, tipos incompatíveis) se compilados juntos; o Serwist compila esse arquivo separado via webpack, sem passar pelo `tsc --noEmit` do projeto. `eslint.config.mjs` ganhou `public/sw.js` no `ignores` (é gerado a cada build, e sem isso o ESLint tentava lintar o bundle minificado como se fosse código-fonte).
80. _(Fase 15)_ Prompt de instalação: hook `useInstallPrompt` (captura `beforeinstallprompt`, expõe `canInstall`/`promptInstall`, detecta `display-mode: standalone` e iOS via `userAgent`) + `InstallAppSection` na aba Preferências de Configurações — mostra o botão real em Chromium/Android, a instrução manual ("Compartilhar → Adicionar à Tela de Início") no Safari/iOS (que não tem o evento), e nada quando o app já está instalado. **`viewport-fit: cover`** + `theme-color` no `viewport` export do layout raiz (Next 15 separa `metadata` de `viewport`); a bottom bar (`MobileNav`, Fase 1) já usava `env(safe-area-inset-bottom)`, então nenhuma mudança foi necessária ali. Lighthouse e teste em dispositivo real (Android Chrome + iOS Safari) ficam para o usuário — exigem deploy com HTTPS real, mesmo padrão da Fase 14 com Lighthouse/RLS (ver "Estado atual", item 5).

---

## Roadmap — status por fase

| #   | Fase                                                                     | Status                                                                                                                       |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 0   | Fundação (repo, Next 15, Tailwind, shadcn, Supabase CLI, deploy inicial) | ✅ código concluído em 16/07/26 — deploy pende de ações de conta do usuário (ver Estado atual)                               |
| 1   | Auth + shell (login, cadastro, middleware, layout)                       | ✅ concluída em 16/07/26 (código + build verde; config do painel Supabase pende — ver Estado atual)                          |
| 2   | Banco completo (migrations, RLS, views, seed)                            | ✅ concluída — migrations 0001–0009 **aplicadas no projeto real** e `src/types/database.ts` gerado (17/07/26)                |
| 3   | Contas + Categorias                                                      | ✅ concluída em 17/07/26 (código + lint + typecheck + build verdes)                                                          |
| 4   | Transações (core)                                                        | ✅ concluída em 17/07/26 (lista, CRUD, transferência, status, anexos; core testado pelo usuário)                             |
| 5   | Parcelamentos                                                            | ✅ concluída em 17/07/26 (form Nx, preview, mãe + parcelas, status por parcela; teste manual pende)                          |
| 6   | Cartões + Faturas                                                        | ✅ concluída em 17/07/26 (CRUD, compra à vista/parcelada, fatura, pagar/reabrir; migration 0010 pende de push)               |
| 7   | Recorrentes                                                              | ✅ concluída em 17/07/26 (CRUD, preview de ocorrências, pausar/retomar, "gerar agora"; teste manual pende)                   |
| 8   | Dashboard (fim do MVP)                                                   | ✅ concluída em 17/07/26 (resumo, saldo previsto, 2 gráficos, recentes, cartões; Suspense por seção)                         |
| 9   | Orçamentos + alertas                                                     | ✅ concluída em 17/07/26 (CRUD, navegação por mês, alerta com notification + toast, sino na topbar)                          |
| 10  | Metas                                                                    | ✅ concluída em 18/07/26 (CRUD, aportes, radial de progresso, conclusão automática, widget no dashboard)                     |
| 11  | Relatórios + export                                                      | ✅ concluída em 18/07/26 (mensal/anual, export CSV/Excel/PDF server-side, rate limit)                                        |
| 12  | Pesquisa global (⌘K)                                                     | ✅ concluída em 18/07/26 (busca de lançamentos + navegação + "novo lançamento")                                              |
| 13  | Configurações                                                            | ✅ concluída em 18/07/26 (perfil, preferências, senha com reautenticação, backup JSON, excluir conta)                        |
| 14  | Polimento                                                                | ✅ concluída em 18/07/26 (CSP + headers, loading.tsx, memoização, rate limit de upload, a11y auditada)                       |
| 17  | Onboarding com histórico (expansão)                                      | ✅ concluída em 18/07/26, ajustes em 19/07/26 (`affects_balance`, import CSV em lote, reconstrução de parcelamento, seleção em massa, paginação numerada, nome de fatura por vencimento; migrations 0012/0013 pendem de push) |
| 15  | Mobile/PWA (expansão)                                                    | ✅ concluída em 19/07/26 (manifest, Serwist, ícones, fallback offline, prompt de instalação, Dialog/tabela/filtros responsivos; Lighthouse e teste em dispositivo real pendem do usuário) |
| 16  | Família / households (expansão)                                          | ⏳ próxima                                                                                                                   |

---

## Fase 0 — Fundação (16/07/26)

**Versões instaladas:** Next.js 15.5.20 · React 19.1.0 · Tailwind v4 · TypeScript 5 · Supabase CLI 2.109.1 (devDependency).
**Criado/configurado:**

- Projeto Next 15 (App Router, `src/`, alias `@/*`, ESLint, Turbopack no dev). Script `build` alterado para `next build` sem Turbopack (build estável na Vercel).
- TypeScript estrito reforçado: `noUncheckedIndexedAccess: true` no `tsconfig.json`.
- ESLint: `@typescript-eslint/no-explicit-any: "error"`, `no-unused-vars` com padrão `_`, `eslint-config-prettier` por último.
- Prettier + `prettier-plugin-tailwindcss` (`.prettierrc`, `.prettierignore`); scripts `format`, `format:check`, `typecheck`.
- shadcn/ui inicializado (**manualmente** — o registro `ui.shadcn.com` era inacessível na rede do ambiente da sessão; resultado idêntico ao `init`): `components.json` (new-york, base zinc, css variables, RSC), tokens light+dark em `src/app/globals.css` (Tailwind v4, `@custom-variant dark`, oklch), `src/lib/utils.ts` com `cn()`. Deps: class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css. Nas próximas fases os componentes de `components/ui` chegam versionados no repo (equivalente a `npx shadcn add …`).
- Dependências da stack instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `recharts`.
- Estrutura de pastas feature-based completa (`src/features/*` com 12 domínios, `components/{ui,layout,shared,charts}`, `hooks`, `lib/supabase`, `services/export`, `types`) com `.gitkeep`.
- Supabase CLI: `supabase/config.toml` (`npx supabase init`, project_id `finapp`) + `supabase/migrations/` vazio (migrations entram na Fase 2). Script `db:types` pronto no `package.json`.
- `.env.example` (URL, anon key, service role — só servidor, `NEXT_PUBLIC_SITE_URL`); `.gitignore` ajustado (`!.env.example`, temporários da CLI).
- Layout raiz em pt-BR com fontes Geist (pacote `geist`, embutido) e classe `dark`; página inicial placeholder da Fase 0.
- `README.md` com passos de setup (GitHub, Supabase, Vercel) e scripts; `docs/ARQUITETURA.md` e `docs/DER.mermaid` versionados no repo.
- Git inicializado localmente (`git init -b main`) — primeiro commit fica para o usuário (autoria própria).
  **Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (build verde).

---

## Fase 1 — Auth + shell (16/07/26)

**Novas dependências:** `@radix-ui/react-{slot,label,dropdown-menu,avatar,separator}`, `sonner`.

**Infra/lib:**

- `src/lib/supabase/client.ts` (browser), `server.ts` (RSC/Actions/handlers, `cookies()` com await) e `middleware.ts` (`updateSession` — renova o JWT e retorna `user` validado por `getUser`).
- `src/lib/action-result.ts` — `ActionResult<T>` + `ok()/fail()` (contrato de toda Server Action).
- `src/lib/utils.ts` — adicionada `sanitizeNextPath()` (anti open-redirect no `?next=`).
- `src/lib/theme-script.ts` — script inline pré-hidratação que aplica o tema do cookie.
- `src/middleware.ts` — proteção de rotas: prefixos protegidos → `/login?next=…`; logado em `/login|/cadastro|/esqueci-senha` → `/dashboard`; `/` → conforme sessão; `/auth/*` passa direto; redirects preservam os cookies renovados.

**Feature auth (`src/features/auth/`):**

- `schemas.ts` — signUp/signIn/forgotPassword/resetPassword (senha 8–72 com letra e número; e-mail trim→lowercase→pipe).
- `actions.ts` — `signUp` (metadata `full_name`, sucesso → tela "confira seu e-mail"), `signIn` (erro genérico anti-enumeração, redirect com `next` sanitizado), `signOut`, `forgotPassword` (resposta idêntica exista ou não o e-mail), `updatePassword` (exige sessão de recuperação). Rate limit (429) tratado em todas.
- `components/` — `login-form`, `signup-form` e `forgot-password-form` (ambos com estado de sucesso), `reset-password-form`, `password-input` (mostrar/ocultar), `form-helpers` (fieldErrors do servidor → RHF).

**Rotas:**

- Grupo `(auth)`: layout centrado com logo + `/login` (lê `?next` e `?erro`), `/cadastro`, `/esqueci-senha`, `/redefinir-senha` (RSC que exige sessão; sem sessão → `/esqueci-senha`).
- Handlers: `/auth/confirm` (verifyOtp por `token_hash`; `next` com fallback por tipo) e `/auth/callback` (exchangeCodeForSession); erro em ambos → `/login?erro=link-invalido`.
- Grupo `(app)`: `layout.tsx` (revalida `getUser` e monta o shell) + `/dashboard` placeholder (widgets na Fase 8).
- Raiz: `layout.tsx` reescrito (script de tema, ThemeProvider, QueryProvider, Toaster, `suppressHydrationWarning`); `page.tsx` reescrito (redirect por sessão).

**Shell (`src/components/layout/`):** `nav-items.ts` (9 itens + Configurações + subset mobile), `app-sidebar.tsx` (colapsável 240→56px, tokens `sidebar`), `topbar.tsx` (breadcrumb da seção, toggle de tema, menu do usuário), `user-menu.tsx` (avatar com iniciais, sair via Server Action), `mobile-nav.tsx` (bottom bar com safe-area), `page-header.tsx`, `theme-provider.tsx` (cookie de 1 ano), `query-provider.tsx` (staleTime 30s).

**UI (`src/components/ui/`, escritos à mão — registro shadcn inacessível na rede da sessão; equivalentes ao `shadcn add`):** button, input, label, card, form, dropdown-menu, avatar, separator, skeleton, sonner.

**Removidos:** `.gitkeep` de `components/ui`, `components/layout` e `lib/supabase` (pastas agora povoadas).

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (12 rotas; páginas de auth estáticas ○, rotas protegidas dinâmicas ƒ, middleware ativo).

**Critério de pronto da fase (depende do passo 4 do README no painel Supabase):** cadastro → e-mail → confirmação → login → logout; rotas protegidas redirecionam para `/login?next=…`; reset de senha completo.

**⚠️ Pendência de validação (16/07/26):** ao testar "esqueci a senha" em produção (Vercel), o link do e-mail deu `link-invalido` na primeira tentativa. Suspeita: fluxo PKCE (`/auth/callback?code=...`) exige o mesmo navegador que solicitou o reset (o cookie do `code_verifier` fica preso a ele) — se o e-mail foi aberto em app/navegador diferente do usado para testar o app, ou se o provedor de e-mail pré-visita o link (scanner de segurança), o código é consumido antes do clique real. Teste sugerido ao usuário: copiar a URL do botão do e-mail (sem clicar) e colar na barra de endereço do mesmo navegador usado para testar o app. Se confirmado, resultado esperado é "funciona nesse fluxo copiar-colar". Solução definitiva (funciona em qualquer navegador) é o fluxo `token_hash` via `/auth/confirm`, que já está implementado no código — só falta habilitar SMTP customizado no Supabase para poder editar o "Source" dos templates de e-mail (documentado no passo 4 do README) e trocar `{{ .ConfirmationURL }}` pelo link com `token_hash`. Login/cadastro/confirmação de conta e logout foram validados com sucesso; apenas o reset de senha em produção ficou pendente de confirmação.

**Causa confirmada — e-mails não chegando em tentativas repetidas:** o serviço de e-mail padrão do Supabase (sem SMTP customizado) tem limite de **apenas 2 e-mails por hora**, compartilhado entre confirmação de cadastro, reset de senha e demais e-mails de auth — e vale para o projeto inteiro (local + produção usam o mesmo projeto Supabase). Ao testar várias vezes seguidas, é fácil bater nesse teto e achar que o app não está enviando (quando na verdade é o Supabase recusando o envio). Resolve-se configurando SMTP customizado (Resend, SendGrid, AWS SES etc.) — mesma solução do item acima.

**Nota:** um usuário de teste foi criado manualmente pelo botão "Add user" do painel Supabase (Authentication → Users) durante essa investigação. Contas criadas assim vêm **auto-confirmadas** (sem e-mail de confirmação) por design do próprio painel — não é um bug e não tem relação com os dois pontos acima. Contas de teste do fluxo real do app devem sempre ser criadas pelo formulário `/cadastro`, não pelo painel. **(Fase 2: o backfill do `0008` garante que essas contas pré-existentes também ganham profile, settings e categorias padrão.)**

---

## Fase 2 — Banco completo (17/07/26)

**Migrations versionadas em `supabase/migrations/` e aplicadas no projeto real** (`npx supabase db push` + `npm run db:types` feitos pelo usuário; `src/types/database.ts` gerado). Guia de aplicação: `APLICAR.md`.

**Arquivos:**

| Arquivo                                              | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/0001_extensions.sql`            | `pg_cron` em bloco guardado (o push nunca falha por extensão ausente); `gen_random_uuid()` é nativo do PG13+ — sem pgcrypto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `supabase/migrations/0002_enums.sql`                 | 9 enums: os 8 planejados + `transfer_direction` (decisão 18)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `supabase/migrations/0003_tables.sql`                | 14 tabelas: as 13 do DER + `rate_limits` (infra §9). Todos os CHECKs de forma: dinheiro `BIGINT` > 0; **exatamente um dono** (conta OU cartão); compra em cartão → `expense` + `invoice_id`; transferência → grupo + direção, sem categoria, nunca cartão; categoria obrigatória fora de transferência; mãe de parcelamento → `installments_total ≥ 2`; dias de cartão 1–28; `reference_month`/`month` sempre dia 1; whitelist de mime + 10 MB em attachments                                                                                                                                                                                                                                                                                                                                                           |
| `supabase/migrations/0004_constraints_indexes.sql`   | FK circular `credit_card_invoices.payment_transaction_id → transactions`; todos os índices, incluindo o **único parcial `(recurring_id, date)`** (idempotência do gerador) e o parcial de varredura do job (`next_run_date where is_active`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `supabase/migrations/0005_rls.sql`                   | RLS nas 14 tabelas; policies "own rows" `to authenticated` com `(select auth.uid())`; `profiles` sem DELETE (exclusão via cascade de `auth.users`); `rate_limits` sem policy nenhuma + REVOKE (tabela e sequence)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `supabase/migrations/0006_functions_triggers.sql`    | `set_updated_at` (8 tabelas); `create_default_categories(uuid)` — 14 categorias (10 despesas + 4 receitas, cores + ícones lucide), idempotente, EXECUTE revogado de clientes; `handle_new_user` (SECURITY DEFINER) + trigger `on_auth_user_created` em `auth.users`; `compute_invoice_period(fechamento, vencimento, data)` (competência D5, IMMUTABLE); `get_or_create_invoice(cartão, data)` (upsert idempotente, INVOKER — RLS do usuário se aplica); `advance_occurrence(início, freq, intervalo, k)` (âncora — sem drift); `generate_recurring_transactions()` (DEFINER, catch-up limitado a k≤1200, `for update skip locked`, `on conflict … do nothing`, retorna nº de ocorrências, EXECUTE revogado de clientes); `check_rate_limit(chave, máx, janela)` (DEFINER; grant só a `authenticated` + `service_role`) |
| `supabase/migrations/0007_views.sql`                 | 5 views com `security_invoker = on`: `v_entries` (camada canônica: transações não-mãe ∪ parcelas com dados da mãe; `entry_kind`, status POR parcela, fatura DA parcela), `v_account_balances` (inicial + pagos com sinal por tipo/direção; cartão não entra — D5), `v_invoice_totals`, `v_budget_usage` (competência, inclui pendentes, `alert_reached`), `v_monthly_summary` (paid/pending por mês, sem transferências/canceladas) + `get_card_available_limit(uuid)` (limite − faturas open/closed; vive aqui porque depende de `v_invoice_totals`)                                                                                                                                                                                                                                                                   |
| `supabase/migrations/0008_storage_backfill_cron.sql` | Bucket privado `attachments` (10 MB, whitelist de mime) com upsert; 3 policies em `storage.objects` (`path[1] = auth.uid()`), guardadas contra `duplicate_object` e `insufficient_privilege` (fallback: painel); **backfill** de profiles/settings/categorias para usuários pré-existentes; agendamento pg_cron diário `0 6 * * *` UTC (= 03:00 de Brasília), guardado                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `supabase/migrations/0009_grants.sql`                | **Correção (decisão 24)** — `GRANT` explícito de `SELECT/INSERT/UPDATE/DELETE` nas 13 tabelas de domínio + `SELECT` nas 5 views para `authenticated`; `ALL` para `service_role`; `ALTER DEFAULT PRIVILEGES` cobrindo tabelas futuras. `rate_limits` de propósito sem grant a `authenticated`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `supabase/tests/smoke_fase2.sql`                     | Smoke test completo — **somente banco local/de estudo** (insere em `auth.users`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**Validação executada (ambiente da sessão, 17/07/26):** Postgres 16.14 real + shim fiel do Supabase (schemas `auth`/`storage`, roles `anon`/`authenticated`/`service_role`, default privileges, `auth.uid()` lendo `request.jwt.claims`, `storage.foldername`). As migrations aplicaram limpas com `ON_ERROR_STOP`, e o smoke test passou inteiro:

- Trigger de signup → profile + settings + **14 categorias** por usuário; fallback do nome pelo prefixo do e-mail.
- **RLS cross-tenant com 2 usuários:** leitura do outro tenant vazia (tabelas E views) e INSERT com `user_id` alheio rejeitado com `42501` — inclusive em `storage.objects` (upload em prefixo alheio bloqueado).
- Saldos derivados com transferência espelhada: A1 = 100.000 + 500.000 − 120.000 − 50.000 = **430.000**; A2 = **50.000**; pendentes não movem caixa.
- Parcelamento: compra-mãe **fora** de `v_entries`, 12 parcelas dentro; competência de julho somando pendente avulsa + parcela 1.
- Fatura: 3 cenários de `compute_invoice_period` (compra pós-fechamento → mês seguinte; vencimento ≤ fechamento → mês seguinte); upsert idempotente (2 chamadas → 1 fatura); total 25.000 e limite disponível 475.000.
- Recorrência mensal ancorada em **31/01/2024**: catch-up completo, ocorrências em **29/02** (bissexto) e **31/03** comprovando ausência de drift, 1 por mês, cursor avançado para o futuro, **segunda rodada = 0** (idempotente).
- Orçamento: gasto 150.000 sobre teto 100.000 → `alert_reached = true`.
- Rate limit: `true, true, false` com máx 2/h; tabela `rate_limits` inacessível para `authenticated` (`42501`).
- `updated_at` automático; bucket + 3 policies de storage presentes.
- **Backfill** validado com usuário criado ANTES das migrations (ganhou profile/settings/14 categorias no `0008`).

**⚠️ Bug real encontrado pelo usuário (17/07/26) e corrigido:** ao rodar exatamente o teste de aceite de RLS sugerido no `APLICAR.md` (2 usuários reais, `set local role authenticated` + `request.jwt.claims`), a query em `categories` falhou com `42501 permission denied for table categories`. Causa: RLS filtra **linhas**, mas o acesso à **tabela** é um privilégio Postgres separado (`GRANT`) — e projetos Supabase mais recentes não concedem isso automaticamente para tabelas novas. As migrations 0001–0008 nunca continham esse `GRANT`; o ambiente de validação local mascarou o problema porque o shim que simula o Supabase concedia esses privilégios "de graça" para imitar o comportamento antigo. Corrigido com a **`0009_grants.sql`** (decisão 24) e revalidado do zero num shim mais fiel (sem a concessão automática) — smoke test passou de novo, agora exigindo genuinamente o `GRANT` da 0009 para funcionar.

**Critério de pronto da fase:** migrations aplicam limpas ✅ (local + projeto real via `db push`) · policies testadas com 2 usuários ✅ (validado localmente + teste de aceite no hosted pelo usuário, que inclusive revelou a necessidade da 0009) · tipos gerados compilando ✅ (`src/types/database.ts`).

---

## Fase 3 — Contas + Categorias (17/07/26)

**Novas dependências:** `@radix-ui/react-{dialog,select,alert-dialog}`.

**Infra/lib:**

- `src/lib/supabase/client.ts` e `server.ts` agora tipados com o **`Database` gerado** — todas as queries/mutações das features saem type-safe (decisão 25).
- `src/lib/money.ts` — `formatCents()` (centavos → "R$ 1.234,56"), `parseCentsFromInput()` / `formatCentsForInput()` (máscara de input, suporta negativo) e `splitInstallments()` (divisão D1 com resto distribuído — pronta para a Fase 5).
- `src/lib/form.ts` — `applyFieldErrors()` movida de `features/auth/components/form-helpers.ts` (que virou re-export) para uso por todas as features (decisão 28).

**UI (`src/components/ui/`, mesmos equivalentes do `shadcn add`):** dialog, alert-dialog, select, badge.

**Shared (`src/components/shared/`):**

- `domain-icon.tsx` — registro fechado `DOMAIN_ICONS` (41 ícones Lucide, kebab-case, inclui os 14 das categorias padrão) + `<DomainIcon>` com fallback (decisão 26).
- `color-picker.tsx` — paleta fechada `DOMAIN_COLORS` (18 cores Tailwind-500, inclui as das categorias padrão), radiogroup acessível.
- `icon-picker.tsx` — grade de ícones do registro, com cor de destaque do ColorPicker.
- `money-input.tsx` — input BRL mascarado que emite **centavos inteiros** para o form (decisão D1), prefixo "R$", `allowNegative` para saldo inicial.
- `money-display.tsx` — formata centavos com `tabular-nums` e cor por sinal (verde/vermelho) opcional.
- `empty-state.tsx` e `confirm-dialog.tsx` (sobre alert-dialog, com estado pending e variante destrutiva).

**Feature accounts (`src/features/accounts/`):**

- `types.ts` — `Account`, `AccountWithBalance` (linha da view `v_account_balances`) e `ACCOUNT_TYPE_LABELS` pt-BR.
- `schemas.ts` — `accountFormSchema` (nome 1–60, tipo do enum via `Constants`, saldo inicial em centavos int com limites, cor hex, ícone) + `accountIdSchema` (uuid).
- `queries.ts` — `getAccountsWithBalances()` lê a view `v_account_balances` (saldo **derivado**, decisão D2), ativas primeiro.
- `actions.ts` — `createAccount`, `updateAccount`, `setAccountArchived`, `deleteAccount`. Todas: `getUser` → Zod → mutação → `revalidatePath("/contas")`. `23505` → erro de campo "nome já existe"; `23503` no delete → "tem lançamentos — arquive"; `count: "exact"` detecta id inexistente/alheio (decisão 28).
- `components/` — `account-form-dialog.tsx` (criar/editar; tipo, saldo inicial via MoneyInput, cor, ícone), `account-card.tsx` (ícone colorido, saldo derivado com cor por sinal, badge "Arquivada", menu editar/arquivar/reativar/excluir com ConfirmDialog), `accounts-summary.tsx` (saldo total + contas ativas, só ativas).

**Feature categories (`src/features/categories/`):**

- `types.ts`, `schemas.ts` (mesmo padrão; tipo `income`/`expense` via `Constants`), `queries.ts` (`getCategories()`).
- `actions.ts` — `createCategory`, `updateCategory` (**não** altera o tipo — decisão 27), `setCategoryArchived`, `deleteCategory` (`23503` → "em uso — arquive"; budgets caem por cascade). `revalidatePath("/categorias")`.
- `components/` — `category-form-dialog.tsx` (tipo travado na edição, `defaultType` para os botões "Nova" por coluna), `category-list.tsx` (duas colunas Despesas/Receitas com linhas ícone+nome+badge+menu de ações).

**Rotas (`src/app/(app)/`):**

- `/contas` — RSC: `PageHeader` + botão "Nova conta" (dialog), `AccountsSummary`, grade de `AccountCard` (ativas), seção "Arquivadas" separada, `EmptyState` para conta zero.
- `/categorias` — RSC: `PageHeader` + `CategoryList` (as 14 categorias padrão do signup já aparecem).

**Removidos:** `.gitkeep` de `features/accounts`, `features/categories` e `components/shared`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (14 rotas; `/contas` e `/categorias` dinâmicas ƒ) · `npm run format:check` ✅.

**Critério de pronto da fase:** criar/editar/arquivar funcionando com validação dupla (Zod no client via RHF resolver e revalidado na Server Action) — código pronto e build verde; **teste manual do usuário pende**: criar conta, editar, arquivar, tentar excluir categoria padrão em uso (deve sugerir arquivar) e conferir o saldo derivado após lançamentos da Fase 4.

---

## Fase 4 — Transações (core) — Parte 1 (17/07/26)

**Novas dependências:** `@radix-ui/react-{tabs,popover}`, `react-day-picker@^9` (fixado — v10 é incompatível com o calendar), `date-fns`.

**Infra/lib:**

- `src/lib/dates.ts` — conversão string "YYYY-MM-DD" ⇄ `Date` **sempre local** (decisão 30), `todayISO()`, `formatDateBR()`.
- `src/hooks/use-debounce.ts` — debounce da busca (300 ms).

**UI (`src/components/ui/`):** sheet (drawer), tabs, popover, calendar (react-day-picker v9, pt-BR), table, textarea.

**Shared:** `date-picker.tsx` (popover + calendar, valor "YYYY-MM-DD").

**Feature transactions (`src/features/transactions/`):**

- `types.ts` — `Entry` (linha de `v_entries`), `signedAmountCents()` (sinal por tipo/direção para exibição), labels pt-BR, `AccountOption`/`CategoryOption`.
- `schemas.ts` — `entryFormSchema` (receita/despesa em conta: descrição, valor em centavos > 0, data, status pago/pendente, conta, categoria, observações) e `transferFormSchema` (origem ≠ destino) + schemas de id/status.
- `queries.ts` — `fetchEntriesPage()` **isomórfico** sobre `v_entries`: filtros (busca ilike, tipo, status, conta, categoria, período) + keyset `(date desc, id desc)` com página de 30 (decisão 30).
- `use-entries.ts` — `useEntries()` (`useInfiniteQuery`; primeira página do RSC como `initialData` quando sem filtros).
- `actions.ts` — `createTransaction`, `updateTransaction` (com guardas — decisão 31), `createTransfer` (par espelhado em 1 INSERT — decisão 29), `updateTransfer`, `setEntryStatus` e `deleteEntry` (ambos pair-aware via `transfer_group_id`). `paid_at` acompanha o status. `revalidatePath` em `/transacoes` **e** `/contas` (saldos derivados).
- `components/` — `transaction-form-drawer.tsx` (Sheet com tabs Despesa/Receita/Transferência ao criar; travado no tipo ao editar; transferência em edição/duplicação busca o par para preencher origem/destino), `transactions-table.tsx` (data, descrição, categoria com ícone/cor, conta, badge de status, valor com sinal; menu: editar/duplicar/pago/pendente/cancelar/excluir com ConfirmDialog), `transaction-filters.tsx` (busca + 4 selects + período + limpar), `transactions-view.tsx` (orquestra filtros com debounce, infinite scroll por IntersectionObserver + botão fallback, empty states, drawer único).

**Rota:** `/transacoes` — RSC busca em paralelo contas ativas, categorias ativas e a primeira página de `v_entries`, e entrega tudo à `TransactionsView`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (15 rotas; `/transacoes` ƒ) · `npm run format:check` ✅.

**Critério de pronto da fase:** `v_entries` e saldos de `/contas` batendo com os lançamentos — **validado manualmente pelo usuário em 17/07/26** ✅ (despesa/receita movendo saldo, transferência espelhada, pendente não move caixa).

### Parte 2 — Anexos no Storage (17/07/26)

- `schemas.ts` — `attachmentMetaSchema` espelhando os CHECKs do banco: whitelist de mime (`image/jpeg|png|webp|gif`, `application/pdf`) e 10 MB (`ATTACHMENT_MIME_TYPES`/`ATTACHMENT_MAX_BYTES`).
- `actions.ts` — `createAttachment` (valida que o `storage_path` está dentro de `user_id/transaction_id/` — espelha a policy de path do bucket — antes de gravar os metadados) e `deleteAttachment` (remove o objeto do Storage e depois a linha). `deleteEntry` agora **limpa os arquivos do Storage** das transações excluídas (inclusive as duas pernas de transferência) antes do DELETE — o cascade só apaga a linha de `attachments`, não o objeto no bucket.
- `components/attachments-list.tsx` — seção "Anexos" no drawer de **edição** (criar precisa salvar primeiro — anexo referencia o `transaction_id`): upload direto do browser para o bucket privado (path `user_id/transaction_id/uuid.ext`), com validação client de mime/tamanho, rollback do arquivo se os metadados falharem; lista com nome/tamanho, download via **signed URL de 60 s** e exclusão com confirmação.
- `transaction-form-drawer.tsx` — renderiza a `AttachmentsList` (com Separator) ao editar qualquer lançamento, inclusive perna de transferência.

**Verificado (fase completa):** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (15 rotas) · `npm run format:check` ✅. **Teste manual dos anexos pende do usuário** (upload de imagem/PDF, download, exclusão, e upload >10 MB sendo recusado).

---

## Fase 5 — Parcelamentos (17/07/26)

**Sem dependências novas.**

**Novo:**

- `src/services/installments.ts` — `buildInstallmentPlan(total, n, firstDueDate)`: divisão exata via `splitInstallments()` (D1, resto distribuído) + vencimentos mensais ancorados na 1ª parcela (decisão 32). Puro, sem React.
- `src/features/transactions/schemas.ts` — `installmentPurchaseSchema` (2–120 parcelas, total ≥ nº de parcelas para nenhuma parcela ficar em 0 centavos, data da compra + vencimento da 1ª parcela).
- `src/features/transactions/actions.ts` — `createInstallmentPurchase` (mãe com `is_installment_parent`/`installments_total` + N parcelas num INSERT único; rollback da mãe em falha) e `setInstallmentStatus` (status/`paid_at` POR parcela).
- `components/installment-preview-table.tsx` — preview do plano (nº, vencimento, valor, total) antes de salvar.

**Alterado:**

- `transaction-form-drawer.tsx` — aba Despesa (criação) ganhou "Parcelamento" (À vista, 2x–48x): parcelado esconde o campo status (parcelas nascem pendentes), mostra vencimento da 1ª parcela + preview, e o submit muda para `createInstallmentPurchase`.
- `transactions-table.tsx` — linha de parcela (`entry_kind = 'installment'`): status muda na parcela (`setInstallmentStatus`); sem editar/duplicar; "Excluir compra inteira" com aviso de que todas as parcelas somem (decisão 33). A coluna descrição já mostrava "· parcela N" desde a Fase 4.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (15 rotas) · `npm run format:check` ✅.

**Critério de pronto:** soma das parcelas = total (garantido por `splitInstallments` + preview) ✅ · relatório mensal conta a parcela do mês (parcelas entram em `v_entries` pela `due_date`) ✅ — **teste manual do usuário pende**: criar compra em 3x, conferir 3 parcelas na lista (mãe invisível), pagar a 1ª e ver o saldo debitar só o valor dela.

---

## Fase 6 — Cartões + Faturas (17/07/26)

**Sem dependências novas.**

**Banco:**

- `supabase/migrations/0010_invoice_payment_report_exclusion.sql` — recria `v_monthly_summary` e `v_budget_usage` excluindo o pagamento de fatura (decisão 34). ⚠️ **Pende `db push`**; só views, sem regen de tipos.

**Infra/lib:**

- `src/lib/dates.ts` — `formatMonthBR()` ("julho de 2026") para competência.
- `src/services/invoices.ts` — `computeInvoicePeriod()` (espelho client de `compute_invoice_period()`; só para preview).

**Feature cards (`src/features/cards/`):**

- `types.ts` — `CreditCard`, `InvoiceTotals` (view `v_invoice_totals`), `CardWithLimit` (cartão + disponível + fatura aberta), `bestPurchaseDay()`.
- `schemas.ts` — `cardFormSchema` (limite, dias 1–28), `payInvoiceSchema`.
- `queries.ts` — `getCardsWithLimits()` (disponível/aberta via `v_invoice_totals`, sem N RPCs), `getCard`, `getCardInvoices`, `getInvoiceItems`.
- `actions.ts` — `createCard`/`updateCard`/`setCardArchived`/`deleteCard` (RESTRICT → "arquive"); `payInvoice` (despesa na conta + quita fatura + propaga `paid`, com rollback) e `reopenInvoice` (desfaz — decisões 34/36).
- `components/` — `card-form-dialog`, `credit-card-widget`, `limit-bar`, `invoice-timeline` (faturas + itens sob demanda + pagar/reabrir), `pay-invoice-dialog`.

**Compra no cartão (em `src/features/transactions/`):**

- `schemas.ts` — `cardPurchaseSchema`, `cardInstallmentPurchaseSchema`.
- `actions.ts` — `createCardPurchase` (RPC `get_or_create_invoice`) e `createCardInstallmentPurchase` (mãe + parcelas, cada uma na fatura do seu mês). `revalidateWithCard` cobre `/cartoes[/id]`.
- `components/transaction-form-drawer.tsx` — nova **aba "Cartão"** (`CardPurchaseForm`; à vista + parcelado, preview via `computeInvoicePeriod`), só aparece se houver cartão. `transactions-table.tsx` — itens de cartão travados (decisão 36), coluna mostra o cartão.
- `app/(app)/transacoes/page.tsx` — carrega cartões ativos.

**Rotas:** `/cartoes` (grid de widgets + arquivados + empty state) e `/cartoes/[id]` (limite/disponível/melhor dia + timeline de faturas).

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (17 rotas) · `npm run format:check` ✅.

**Critério de pronto:** compra após o fechamento cai na fatura seguinte (`compute_invoice_period`) ✅ · pagamento debita a conta e marca os itens como pagos ✅ — **teste manual do usuário pende** (aplicar 0010 antes; criar cartão, lançar compra à vista e em 3x, conferir faturas e limite, pagar uma fatura e ver o saldo da conta cair).

---

## Fase 7 — Recorrentes (17/07/26)

**Sem dependências novas.**

**Banco:**

- `supabase/migrations/0011_grant_generate_recurring.sql` — `grant execute` de `generate_recurring_transactions()` ao `service_role` (a 0006 revogou de todos e não reconcedeu; sem isso o "Gerar agora" dá _permission denied_ — decisão 38). ⚠️ **Pende `db push`**; só grant, sem regen de tipos.

**Infra/lib:**

- `src/lib/supabase/admin.ts` — client com **service role** (ignora RLS, só servidor) para chamar a função do cron on-demand (decisão 38).
- `src/services/recurrence.ts` — `advanceOccurrence()` (espelho de `advance_occurrence()`), `firstRunOnOrAfter()` (cursor sem backfill, salto analítico p/ daily/weekly) e `nextOccurrences()` (preview). Puro. **Verificado** com casos concretos (drift mensal 31/01→29/02→31/03, ano bissexto, quinzenal, start passado/futuro, corte por `end_date`).

**Feature recurring (`src/features/recurring/`):**

- `types.ts` — `Recurring`, `frequencyLabel()` ("Mensal", "A cada 2 semanas").
- `schemas.ts` — `recurringFormSchema` (superRefine: exatamente um dono; cartão → só despesa; `end_date >= start_date`; `end_date` nullable **sem** `.transform()` — transform quebra o resolver do RHF).
- `queries.ts` — `getRecurring()` (ativos primeiro).
- `actions.ts` — `createRecurring`, `updateRecurring` (recalcula cursor só se a agenda mudou), `setRecurringActive` (retomar re-ancora), `deleteRecurring` (SET NULL, sempre funciona) e `runRecurringGeneration` (service role → função do cron; decisão 38).
- `components/` — `recurring-form-dialog` (tabs despesa/receita, fonte conta/cartão, frequência + intervalo, início/fim, preview ao vivo), `next-occurrences-preview` (badges), `generate-now-button`, `recurring-list` (cards com próxima ocorrência, pausar/retomar, excluir).

**Rota:** `/recorrentes` — RSC carrega recorrências + contas/categorias/cartões; "Gerar agora" + "Nova recorrência" no header; empty states (inclusive "crie uma conta primeiro").

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (18 rotas) · `npm run format:check` ✅ · lógica de recorrência conferida por script.

**Critério de pronto:** job gera pendências sem duplicar (índice único parcial `(recurring_id, date)`) ✅ — **teste manual do usuário pende** (⚠️ aplicar `0011` antes): criar "Aluguel mensal dia 5", clicar "Gerar agora", ver o lançamento pendente em `/transacoes`; pausar/retomar; conferir que "Gerar agora" 2× não duplica. Requer `SUPABASE_SERVICE_ROLE_KEY` no ambiente para o "Gerar agora" (o cron diário funciona sem isso).

**⚠️ Ajuste pós-teste (17/07/26):** o usuário reportou que o "Gerar agora" falhava e que o salário (início 06/07) não era materializado. Causas e correções: (1) faltava o grant ao `service_role` → migration `0011`; (2) `next_run_date` era posto na 1ª ocorrência **futura**, pulando o 06/07 já passado → agora é o próprio `start_date` (decisão 37 revista). **A recorrência "Salário" já existente foi criada sob a regra antiga (cursor em agosto): apague-a e recrie após aplicar a `0011`** para o salário de julho ser gerado.

---

## Fase 8 — Dashboard (fim do MVP) (17/07/26)

**Sem dependências novas** (Recharts já estava no projeto desde a Fase 0). Nenhuma migration.

**Charts (`src/components/charts/`, `"use client"`):**

- `income-expense-bar-chart.tsx` — barras receitas (emerald) × despesas (rose) por mês, eixo em BRL compacto, tooltip/legend custom.
- `category-donut-chart.tsx` — donut com uma fatia por categoria na **cor da categoria**, tooltip com valor + %.

**Shared:** `stat-card.tsx` — tile de indicador (rótulo + ícone + número + dica).

**Feature dashboard (`src/features/dashboard/`):**

- `queries.ts` — `getSummary` (saldo, receitas/despesas pagas do mês, saldo previsto — decisão 39), `getMonthlySeries` (6 meses, preenche meses vazios), `getCategorySpending` (mês atual, exclui pagamento de fatura), `getRecentEntries` (8 últimas).
- `components/` — `summary-cards`, `monthly-chart-section`, `category-spending-section`, `recent-transactions`, `cards-overview` (todas RSC async) + `dashboard-skeletons` (fallbacks de Suspense).

**Rota:** `/dashboard` reescrita — 4 cards de resumo + gráfico mensal (2/3) e donut (1/3) + últimas movimentações (2/3) e overview de cartões (1/3), cada bloco em seu próprio `<Suspense>`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (18 rotas; `.next` precisou de limpeza uma vez — decisão 40) · `npm run format:check` ✅.

**Critério de pronto:** números idênticos aos das telas de origem (o saldo bate com `/contas`; gastos por categoria e mensal saem das mesmas views dos relatórios) ✅ (por construção — mesmas views) — **teste manual do usuário pende** (aplicar `0010` antes; conferir saldo vs `/contas`, gráfico e donut com dados reais).

---

## Fase 9 — Orçamentos + alertas (17/07/26)

**Sem dependências novas.** Nenhuma migration.

**Shared:** `components/shared/month-nav.tsx` — navegação "‹ mês ›" simples (sem picker; decisão 42).

**Feature budgets (`src/features/budgets/`):**

- `types.ts` — `Budget`, `BudgetUsage` (view `v_budget_usage`), `BudgetAlert`.
- `schemas.ts` — `budgetFormSchema` (mês sempre dia 1, threshold 0.05–1.00, espelhando os CHECKs do banco).
- `queries.ts` — `getBudgetUsage(month)`.
- `actions.ts` — `createBudget`/`updateBudget` (categoria/mês travados na edição)/`deleteBudget`; 23505 → erro de campo.
- `alert.ts` — `maybeBudgetAlert()`: lê `v_budget_usage`, se `alert_reached` e ainda não notificado (`metadata @> {budget_id, month}`), insere `notification` e devolve `{categoryName, usagePct}` para o toast. Melhor esforço (decisão 41).
- `components/` — `budget-form-dialog` (slider de threshold), `budget-card` (barra de uso, cor por severidade: normal/âmbar no alerta/vermelho estourado), `budgets-view` (client: `MonthNav` + grid, troca de mês via TanStack Query).

**Instrumentado em `features/transactions/actions.ts`:** `createTransaction`, `createInstallmentPurchase`, `createCardPurchase` e `createCardInstallmentPurchase` agora retornam `{ alert: BudgetAlert | null }` — o `transaction-form-drawer.tsx` mostra um `toast.warning` extra quando o orçamento é cruzado.

**Feature notifications (`src/features/notifications/`):** `types.ts`, `actions.ts` (`markNotificationRead`, `markAllNotificationsRead`), `components/notifications-popover.tsx` — sino na Topbar com badge de não lidas, lista com "marcar como lida" por item e "marcar todas".

**Rota:** `/orcamentos` — RSC entrega o mês atual como `initialData`; troca de mês é só client.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (19 rotas) · `npm run format:check` ✅.

**Critério de pronto:** estourar o threshold gera notificação uma única vez por mês/orçamento ✅ (idempotência por `metadata`) — **teste manual do usuário pende**: criar orçamento de R$ 100 numa categoria, lançar uma despesa de R$ 90 nela (deve avisar), lançar outra de R$ 5 (não deve notificar de novo), conferir o sino na topbar.

---

## Fase 10 — Metas (18/07/26)

**Sem dependências novas** (Recharts já estava no projeto). Nenhuma migration.

**Infra:** `src/services/goals.ts` — `computeGoalProjection()` (puro: quanto falta e, se há `target_date`, aporte mensal necessário a partir de hoje).

**Charts:** `components/charts/goal-progress-radial.tsx` — anel de progresso de série única (Recharts `RadialBarChart`), percentual no centro.

**Feature goals (`src/features/goals/`):**

- `types.ts` — `Goal`, `GOAL_STATUS_LABELS`, `goalProgressPct()` (trava em 100% mesmo se `current > target`).
- `schemas.ts` — `goalFormSchema`, `contributeSchema`.
- `queries.ts` — `getGoals()` (ativas → concluídas → arquivadas).
- `actions.ts` — `createGoal`/`updateGoal`/`deleteGoal`, `setGoalArchived` (só active⇄archived), `contributeToGoal` (soma em `current_amount_cents`; ao cruzar o alvo, `status → completed` de forma irreversível + notification `goal_reached` — decisão 43).
- `components/` — `goal-form-dialog`, `contribute-dialog`, `goal-card` (radial + progresso + projeção + menu editar/arquivar/excluir), `goals-list`.

**Dashboard:** `features/dashboard/components/goals-overview.tsx` — até 3 metas ativas com radial pequeno; integrado em `/dashboard` (preenchendo a lacuna da decisão 40).

**Rota:** `/metas` — RSC + `EmptyState`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (20 rotas) · `npm run format:check` ✅.

**Critério de pronto:** percentuais e projeção corretos ✅ (cálculo direto, sem estado intermediário) — **teste manual do usuário pende**: criar meta de R$ 500 com data em 3 meses (conferir o "aporte/mês" sugerido), aportar R$ 200, aportar R$ 300 (deve concluir automaticamente + notificação no sino), tentar aportar numa meta concluída (deve ser bloqueado).

---

## Fase 11 — Relatórios + export (18/07/26)

**Novas dependências:** `exceljs` (Excel), `pdfmake` + `@types/pdfmake` (PDF). CSV é nativo, sem dependência.

**services/export/ (funções genéricas, não uma por domínio — decisão 45):**

- `csv.ts` — `buildTableCsv(headers, rows)`: RFC 4180 + BOM UTF-8.
- `xlsx.ts` — `buildTableXlsx(sheetName, headers, rows)`: uma aba, cabeçalho em negrito, larguras automáticas (`exceljs`).
- `pdf.ts` — `buildTablePdf(title, subtitle, headers, rows, rightAlignColumns)`: A4, tabela com cabeçalho repetido (`pdfmake`, singleton configurado no módulo com fontes Roboto + `localAccessPolicy` restrita ao diretório de fontes — decisão 46). **Verificado gerando um PDF e um XLSX reais em Node**, não só nos tipos.

**Feature reports (`src/features/reports/`):**

- `types.ts` — `ReportEntryRow`, `MonthlyReportData`, `AnnualReportData`.
- `queries.ts` — `getMonthlyReport(month)` (resumo de `v_monthly_summary` + lançamentos de `v_entries` com nome de categoria/conta-cartão já resolvido) e `getAnnualReport(year)` (12 meses de `v_monthly_summary`, preenchendo meses sem movimento).
- `components/` — `report-filters` (Tabs Mensal/Anual + `MonthNav`/`YearNav`, navega via query string — a página RSC re-busca a cada troca), `monthly-report` (cards + tabela de lançamentos), `annual-report` (tabela de 12 meses + totais), `export-menu` (dropdown CSV/Excel/PDF; usa `fetch` + blob, não navegação direta, para conseguir mostrar toast de erro em vez de abrir uma aba com JSON crua).

**Route Handler:** `app/api/export/route.ts` (`GET`) — autentica (`getUser`), valida query com Zod (`discriminatedUnion` scope monthly/annual), checa rate limit via RPC `check_rate_limit` (20/hora), monta `headers`/`rows` do relatório pedido e devolve o arquivo com `Content-Type`/`Content-Disposition` corretos.

**Shared:** `components/shared/year-nav.tsx` — navegação "‹ ano ›", mesmo padrão do `MonthNav`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (21 rotas, incl. `/api/export`) · `npm run format:check` ✅ · CSV/XLSX/PDF gerados de fato em Node (bytes reais, não só compilação).

**Critério de pronto:** arquivos exportados abrem corretos com os mesmos números da tela ✅ (export e tela leem a mesma query — não há duplicação de cálculo) — **teste manual do usuário pende**: em `/relatorios`, exportar o mês atual nos 3 formatos e abrir cada um (confirmar acentuação no PDF/CSV), trocar para Anual e exportar, e testar o rate limit (21 exports na mesma hora deve bloquear no 21º).

---

## Fase 12 — Pesquisa global (18/07/26)

**Nova dependência:** `cmdk` (não era transitiva — instalada direto).

**UI:** `components/ui/command.tsx` — equivalente ao `shadcn add command`: `Command`/`CommandDialog` (sobre o `Dialog` já existente do projeto, título/descrição em `sr-only`)/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/`CommandItem`/`CommandSeparator`/`CommandShortcut`.

**Layout:**

- `components/layout/command-palette.tsx` — `CommandPalette` (client, global): atalho `Ctrl/Cmd+K` + evento customizado `COMMAND_PALETTE_OPEN_EVENT` (decisão 48); sem termo digitado mostra "Ações rápidas" (Novo lançamento) e "Navegar" (todos os itens de `nav-items.ts`); com 2+ caracteres, busca lançamentos em `v_entries` por descrição (debounce 250 ms, ilike, categoria resolvida em query separada — decisão 47).
- `topbar.tsx` — botão de busca (ícone `Search`) que dispara o evento de abrir a palette; útil em mobile, sem teclado físico.

**Transações:** `transactions-view.tsx` — lê `?novo=1` da URL (vindo da palette) para abrir o drawer de criação já na carga, depois limpa a URL com `router.replace`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (21 rotas) · `npm run format:check` ✅.

**Critério de pronto:** busca com debounce < 300 ms percebidos ✅ (250 ms) — **teste manual do usuário pende**: `Ctrl/Cmd+K` de qualquer tela, digitar parte da descrição de um lançamento real e confirmar que aparece; testar "Novo lançamento" (deve abrir `/transacoes` com o drawer já aberto) e a navegação rápida para 2–3 seções. ✅ **Validado pelo usuário em 18/07/26.**

---

## Fase 13 — Configurações (18/07/26)

**Nova dependência:** `@radix-ui/react-switch`.

**UI:** `components/ui/switch.tsx` — equivalente ao `shadcn add switch`.

**Feature settings (`src/features/settings/`):**

- `types.ts` — `Profile`, `Settings`, listas fechadas `CURRENCY_OPTIONS`/`LOCALE_OPTIONS` (moeda/idioma não têm CHECK no banco — restritas na UI por simplicidade do MVP, qualquer valor de 3/5 chars continuaria válido no banco).
- `schemas.ts` — `profileFormSchema`, `preferencesFormSchema`, `changePasswordFormSchema` (mesma regra de força de senha da Fase 1, duplicada de propósito — trocar senha logado não depende do fluxo de auth pública), `deleteAccountSchema` (decisão 52 — cuidado com `.refine` inferindo predicate).
- `queries.ts` — `getProfile()`, `getSettings()`.
- `actions.ts` — `updateProfile` (sincroniza `profiles` **e** `user_metadata.full_name` — decisão 51), `updatePreferences`, `changePassword` (reautenticação — decisão 51), `deleteAllUserAttachments` (limpeza recursiva do Storage — decisão 50) e `deleteAccount` (service role, termina em `redirect("/login")`).
- `components/` — `profile-form` (com preview do avatar), `preferences-form` (moeda/idioma/switches de notificação), `password-form`, `backup-section` (baixa `/api/backup`), `danger-zone` (input "EXCLUIR" trava o botão até o texto bater exatamente).

**Route Handler:** `app/api/backup/route.ts` (`GET`) — JSON com todas as tabelas de domínio do usuário (via RLS, sem service role — é leitura), rate limit 5/hora.

**Layout:** `UserMenu`/`(app)/layout.tsx` agora leem `profiles.avatar_url` e mostram via `AvatarImage` (antes só iniciais) — a Fase 13 seria a primeira vez que esse campo teria alguma UI para editá-lo, então ficaria "morto" sem essa exibição.

**Rota:** `/configuracoes` — RSC busca profile+settings, `Tabs` com as 4 seções.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (23 rotas, incl. `/api/backup`) · `npm run format:check` ✅.

**Critério de pronto:** exclusão remove banco + storage ✅ (cascade de `auth.users` + limpeza explícita do bucket) — **teste manual do usuário pende** (⚠️ **exclusão de conta é irreversível** — testar por último, ou numa conta descartável): editar perfil e confirmar que o nome muda na Topbar; trocar senha com a senha atual errada (deve falhar) e depois certa; baixar o backup e abrir o JSON; só então testar excluir conta.

---

## Fase 14 — Polimento (18/07/26) — 🏁 fecha o roadmap

**Sem dependências novas.** Nenhuma migration.

**`next.config.ts`** — CSP completa (`script-src`/`style-src unsafe-inline` por necessidade real do Next/tema/estilos inline dinâmicos, nunca por preguiça — cada exceção comentada com o motivo; `connect-src` restrito a self + Supabase; `frame-ancestors`/`object-src none`) + `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (decisão 53). Antes desta fase o projeto não tinha **nenhum** header de segurança.

**`app/(app)/loading.tsx`** — um fallback de navegação para as 12 rotas do grupo que não tinham skeleton próprio (decisão 54); o dashboard mantém seus `<Suspense>` internos por seção, que continuam disparando antes deste fallback genérico.

**Performance:** `EntryRow` da tabela de transações agora é `React.memo`; `TransactionsView` ganhou `handleEdit`/`handleDuplicate` estáveis via `useCallback` (pré-requisito do memo — decisão 54).

**Segurança:** rate limit (60/hora) no upload de anexos (`createAttachment`, `features/transactions/actions.ts`) — a última Server Action de escrita de alto volume que ainda não usava `check_rate_limit()`.

**Acessibilidade:** auditoria dos 19 botões só-ícone do projeto — todos já tinham `aria-label`; navegação (`AppSidebar`/`MobileNav`) já usava `aria-current`; ícones puramente decorativos já tinham `aria-hidden`. Nenhuma correção necessária, só confirmação.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (23 rotas) · `npm run format:check` ✅.

**Critério de pronto:** checklist de segurança auditado ✅ (headers configurados e documentados) — **Lighthouse e o re-teste de RLS com 2 usuários (`APLICAR.md`) ficam para o usuário**, pois exigem o app rodando/deployado e duas contas reais, fora do alcance de uma sessão sem navegador.

---

## 🏁 MVP completo — Fases 0 a 14

O roadmap original da `ARQUITETURA.md` §11 ficou **integralmente implementado em código** ao fim da Fase 14. A partir daqui o projeto segue em **expansão** (`docs/ARQUITETURA-EXPANSAO.md` e `docs/ARQUITETURA-EXPANSAO-HISTORICO.md`), começando pela Fase 17 (decisão 55).

---

## Fase 17 — Onboarding com histórico (18/07/26)

**Baseada em `docs/ARQUITETURA-EXPANSAO-HISTORICO.md`.** Migration `0012` (pende de `db push` + `db:types`, ver "Estado atual"). Decisões 55–65.

**Banco (`supabase/migrations/0012_backfill_affects_balance_import.sql`):**

- `affects_balance boolean not null default true` em `transactions` e `transaction_installments` (decisão 56).
- Tabela `import_batches` (RLS own rows) + `transactions.import_batch_id`/`import_hash` (decisão 61).
- `v_entries` e `v_account_balances` recriadas (`security_invoker` mantido) — a segunda passa a filtrar `affects_balance = true`; `v_monthly_summary`/`v_budget_usage`/`v_invoice_totals` intactas de propósito.
- `src/types/database.ts` **hand-patched** nesta sessão (sem acesso a `db push` real) — substituir por `npm run db:types` depois do push do usuário.

**Novas dependências:** `@radix-ui/react-{tooltip,checkbox,collapsible}`, `papaparse` + `@types/papaparse`.

**`src/services/import/`** (puro, sem React): `hash.ts` (`computeImportHash` — sha-256 de contexto|data|valor|descrição normalizada), `csv-parse.ts` (`parseCsvFile`, client-side, UTF-8/latin1), `mapping.ts` (`ColumnMapping`, `parseDateFlexible`, `parseMoneyFlexible`, `mapCsvRows` — 3 formatos de data, 3 modos de valor), `category-suggestion.ts` (`buildCategorySuggestionIndex`/`suggestCategory` — votação por palavra-chave).

**`src/features/import/`** (nova feature): `types.ts`, `schemas.ts` (`importAccountSchema`/`importCardSchema`/`analyzeImportRowsSchema`), `queries.ts` (`getRecentImportBatches`, `getCategorySuggestionSource`), `actions.ts` (`checkCardImportContext`, `analyzeImportRows`, `importAccountEntries`, `importCardEntries`, `undoImport`, `fetchCategorySuggestionSource` — wrapper de Server Action porque `queries.ts` usa `lib/supabase/server`, que não pode ser importado direto por Client Component), `components/import-wizard.tsx` (fluxo contexto→arquivo→mapeamento→revisão→confirmação, um componente para os dois contextos), `components/review-table.tsx` (estado React simples, decisão 59), `components/installment-backfill-form.tsx` (entrada c), `components/import-hub.tsx` (orquestra os 3 diálogos + lista de importações recentes com "Desfazer").

**Reconstrução de parcelamento em andamento** (`features/transactions/schemas.ts` — `installmentBackfillAccountSchema`/`installmentBackfillCardSchema`; `features/transactions/actions.ts` — `createInstallmentBackfillPurchase`/`createCardInstallmentBackfillPurchase` + helper privado `settleInvoiceHistorically`): decisão 62.

**UI existente ajustada:** `historical-badge.tsx` (novo, shared) + checkbox "Lançamento histórico" numa seção "Avançado" colapsável no drawer de lançamento/transferência e no diálogo de pagar fatura (decisões 56–57); `transactions-table.tsx` e `invoice-timeline.tsx` mostram o badge; `dashboard/queries.ts` (saldo previsto) e `cards/queries.ts`/`cards/types.ts` (`InvoiceWithHistory.paymentIsHistorical`, derivado por join) ajustados.

**Rota:** `/transacoes/importar` (hub com 3 entradas + lista de lotes recentes) + botão "Importar" na página `/transacoes`.

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (24 rotas, incl. `/transacoes/importar`).

**Critério de pronto (teste manual do usuário, com dados reais, após aplicar a `0012`):** conta com saldo inicial X → importar extrato de 3 meses → saldo continua X, relatórios mostram os 3 meses, nenhuma notificação de mês passado; reimportar o mesmo CSV → 0 importadas (dedup); "Desfazer importação" → tudo volta; fatura histórica paga → saldo não muda, badge na timeline; parcelamento reconstruído com K de N pagas → saldo previsto e faturas futuras corretos; lançamento avulso do dia a dia idêntico a antes (default `affects_balance=true`).

---

## Fase 17 — ajustes pós-conclusão (18–19/07/26)

Três rodadas de correções e refinamentos em cima da Fase 17, todas a partir de uso real do app pelo usuário (não achados de código). Decisões 66–73.

**18/07/26 — paginação numerada + seleção em massa (`transactions/queries.ts`, `use-entries.ts`, `transactions-view.tsx`, `transactions-table.tsx`, `transactions/actions.ts`):** `/transacoes` trocou keyset + infinite scroll (decisão 30) por paginação offset numerada com tamanho configurável (25/50/75/100) — pedido do usuário. Checkbox por linha, "selecionar todos (desta página)", barra de ação com exclusão em lote (`deleteEntries`, reusa o núcleo de `deleteEntry`). Decisões 66–67.

**19/07/26 — nome de fatura por vencimento (Sicredi):** migration `0013` — `credit_cards.invoice_name_by_due_month`, checkbox no form do cartão, lido em `payInvoice` e na `InvoiceTimeline`. Puramente cosmético (decisão 68).

**19/07/26 — correção: import ia para o mês errado em cartões com a flag acima ligada.** O seletor "Competência da fatura" do wizard não coincidia com o rótulo (por vencimento) que o usuário via na tela do cartão — escolher "novembro" produzia uma fatura rotulada "dezembro". Corrigido com `invoiceLabelMonth`/`resolveReferenceMonthForLabel` em `services/invoices.ts`: o seletor agora escolhe e exibe no mesmo espaço de rótulo da timeline. Decisão 69.

**19/07/26 — lote de correções de import reportadas pelo usuário:**

- Sugestão de categoria (decisão 59) sugeria sempre a mesma categoria genérica (voto dominado por "parcela" e por boilerplate de extrato) ou categorias erradas para descrições comuns (posto de gasolina/Receita Federal como "Alimentação") — corrigido com stoplist ampliada, remoção do sufixo de parcelamento antes de tokenizar, e voto ponderado por concentração em vez de contagem bruta (`services/import/category-suggestion.ts`). Decisão 70.
- Categoria agora editável inline em itens de cartão/parcela travados, via `updateEntryCategory` (`transactions/actions.ts`, `transactions-table.tsx`). Decisão 71.
- `mapCsvRows` (`services/import/mapping.ts`) passou a receber o contexto (conta/cartão) — o modo "valor com sinal" tem semântica invertida entre extrato e fatura; sem isso, importar fatura nesse modo descartava as compras. `isRealDate()` rejeita datas de calendário inexistentes; `fixDoubleEncodedUtf8()` (`services/import/csv-parse.ts`) corrige mojibake de CSVs já corrompidos na origem; `IMPORT_DESCRIPTION_MAX` 120→300 caracteres (Pix). `validateRowCategories` (`import/actions.ts`) bloqueia categoria de tipo incompatível com a linha. Decisão 72.
- Diálogo do wizard ganhou modo expandido (até 80vw) e coluna "Valor" fixa (sticky) na revisão — descrições de extrato bancário são longas.
- Rate limit de import elevado temporariamente para 50/h (decisão 73) — **reverter para 10/h depois do backfill inicial** (ver "Estado atual").

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (24 rotas).

---

## Fase 15 — Mobile/PWA (19/07/26)

**Baseada em `docs/ARQUITETURA-EXPANSAO.md`.** Sem migration — fase que não toca banco (decisão 55). Decisões 74–80.

**PWA:** `src/app/manifest.ts` (nome, `start_url: /dashboard`, `display: standalone`, tons zinc-900/emerald), `src/app/sw.ts` (Serwist — precache dos assets estáticos + fallback `/offline` via `additionalPrecacheEntries`, desligado em dev), `src/app/offline/page.tsx` (rota estática). Ícones (`public/icons/`: 192/512 "any", 192/512 "maskable", 180 apple-touch-icon) gerados por script Node autocontido (PNG bruto via zlib, sem dependência de imagem). `layout.tsx` ganhou `viewport` export (`viewportFit: "cover"`, `themeColor`) e `appleWebApp`/`icons.apple` pro iOS. `next.config.ts` envolvido em `withSerwistInit`; CSP ganhou `worker-src 'self'`. `sw.ts` excluído do `tsconfig.json` (lib `webworker` vs `dom`) e `public/sw.js` (gerado a cada build) excluído do ESLint e do git.

**Instalação:** `src/hooks/use-install-prompt.ts` + `InstallAppSection` (aba Preferências de `/configuracoes`) — botão real via `beforeinstallprompt` no Chromium/Android, instrução manual no Safari/iOS, nada quando já instalado.

**Responsivo — Dialog:** `components/ui/dialog.tsx` (`DialogContent`) ganhou classes que o tornam tela cheia abaixo do `sm` e mantêm o modal centralizado de sempre a partir dali — uma mudança só, sem componente Sheet paralelo nem dependência nova (decisão 74). Os 2 diálogos com tamanho customizado (`import-wizard.tsx`, `import-hub.tsx`, `recurring-form-dialog.tsx`) tiveram os overrides prefixados com `sm:`.

**Responsivo — alvos de toque:** `Button` (`size="icon"`) virou `size-11 sm:size-9` (decisão 75) — cobre ~21 botões só-ícone do app numa única mudança.

**Responsivo — tabela de transações:** lógica extraída pra `useEntryRowState` (hook) + `EntryCategoryField`/`EntryActionsMenu` (compartilhados), consumidos por `EntryRow` (tabela, ≥ sm, inalterada) e pelo novo `EntryCard` (lista de cards, < sm) — decisão 76.

**Responsivo — filtros:** barra de `/transacoes` colapsável no mobile atrás de um botão "Filtros" com badge de contagem; busca continua sempre visível (decisão 77).

**Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (26 rotas, incl. `/offline` e `/manifest.webmanifest`).

**Pendente do usuário** (exige deploy real, fora do alcance desta sessão): Lighthouse reconhecendo o PWA como instalável; instalar em Android Chrome + iOS Safari e testar modo standalone; testar o fallback offline em modo avião; conferir os 6 itens do checklist responsivo em ~390 px num navegador/dispositivo real, não só no DevTools.

---

## Histórico de atualizações deste changelog

- **[19/07/26]** — **Fase 15 concluída — Mobile/PWA**: manifest + Serwist (service worker com fallback offline), ícones do app, prompt de instalação (Chromium + instrução iOS), CSP com `worker-src`. Dialog vira tela cheia no mobile via CSS (sem Sheet/vaul), botões só-ícone com alvo de toque de 44px no mobile, tabela de transações com visão em cards abaixo do sm, barra de filtros colapsável. Decisões 74–80. Lint + typecheck + build verdes (26 rotas). Próxima e última do roadmap combinado: Fase 16 — Família. Pendente do usuário: Lighthouse e teste em dispositivo real (exige deploy).
- **[19/07/26]** — **Fase 17 — ajustes pós-conclusão**: migration `0013` (nome de fatura por mês de vencimento, cartões Sicredi), correção do seletor de mês do import de fatura (ia para o mês seguinte em cartões com esse rótulo), sugestão de categoria mais precisa (voto ponderado + stoplist ampliada), categoria editável em itens travados, robustez do parser de CSV (datas inválidas, mojibake, limite de descrição, contexto conta/cartão no modo "valor com sinal"), guarda de categoria×tipo na confirmação. Decisões 68–73. Lint + typecheck + build verdes (24 rotas). Pendência: reverter rate limit de import para 10/h.
- **[18/07/26]** — Paginação de `/transacoes` trocada de infinite scroll para páginas numeradas (25/50/75/100 por página) + seleção em massa com exclusão em lote. Decisões 66–67.
- **[18/07/26]** — **Fase 17 concluída — Onboarding com histórico** (expansão pós-MVP, `docs/ARQUITETURA-EXPANSAO-HISTORICO.md`): `affects_balance` em `transactions`/`transaction_installments` (migration `0012`, pende de `db push` + `db:types`), fork B2 para fatura histórica, import CSV em lote (conta e fatura de cartão, com dedup e sugestão de categoria), reconstrução de compra parcelada em andamento, hub `/transacoes/importar`. Decisões 55–65. Lint + typecheck + build verdes (24 rotas). Próxima: Fase 15 — Mobile/PWA.
- **[18/07/26]** — **🏁 Fase 14 concluída — roadmap completo (Fases 0–14).** CSP + headers de segurança (`next.config.ts`, antes inexistentes), `loading.tsx` global do grupo `(app)`, `React.memo` + `useCallback` na lista de transações, rate limit no upload de anexos, auditoria de a11y (sem pendências). Decisões 53–54. Build verde (23 rotas). Sem próxima fase — restam testes manuais e pendências de conta do usuário.
- **[18/07/26]** — Fase 13 concluída: `/configuracoes` (Perfil, Preferências, Segurança com reautenticação, Dados com backup JSON e excluir conta via service role + limpeza recursiva do Storage). Avatar agora aparece no UserMenu. Decisões 50–52. Build verde (23 rotas). Fase 12 validada pelo usuário. Próxima e última: Fase 14 — Polimento.
- **[18/07/26]** — Fase 12: correção — busca da Command Palette mostrava resultado errado (filtro fuzzy embutido do `cmdk` brigando com o filtro real via query). `shouldFilter={false}` no `Command`. Decisão 49.
- **[18/07/26]** — Fase 12 concluída: Command Palette global (Ctrl/Cmd+K), busca de lançamentos por descrição, navegação rápida, "Novo lançamento" abrindo o drawer via `?novo=1`. Decisões 47–48. Build verde (21 rotas). Próxima: Fase 13 — Configurações.
- **[18/07/26]** — Fase 11 concluída: relatórios mensal/anual (mesma fonte de dados do dashboard) e export CSV/Excel/PDF sempre server-side via Route Handler, com rate limit (`check_rate_limit` RPC). `pdfmake` singleton verificado gerando PDF real com acentuação pt-BR (não só nos tipos). Decisões 45–46. Build verde (21 rotas). Próxima: Fase 12 — Pesquisa global.
- **[18/07/26]** — Fase 10 concluída: metas com aporte, radial de progresso, projeção simples, conclusão automática + notificação, widget no dashboard. Decisões 43–44. Build verde (20 rotas). Próxima: Fase 11 — Relatórios + export.
- **[17/07/26]** — Fase 9 concluída: orçamentos mensais por categoria (`v_budget_usage`), navegação por mês, alerta idempotente via `notification` + toast instrumentado nas 4 actions de criar despesa, central de notificações (sino na Topbar). Decisões 41–42. Build verde (19 rotas). Próxima: Fase 10 — Metas.
- **[17/07/26]** — Fase 8 concluída (**fim do MVP**): dashboard com resumo (saldo, receitas/despesas, saldo previsto por caixa), gráfico receitas×despesas (6 meses), donut de gastos por categoria, últimas movimentações e overview de cartões; RSC + Suspense por seção; charts Recharts em `components/charts`. Decisões 39–40. Build verde (18 rotas). Próxima: Fase 9 — Orçamentos.
- **[17/07/26]** — Fase 7: correção pós-teste do usuário — migration `0011` (grant de `execute` ao `service_role`, que faltava para o "Gerar agora") + `next_run_date` = `start_date` na criação (gera desde o início escolhido, em vez de pular o passado). Decisões 37 (revista) e 38 atualizadas.
- **[17/07/26]** — Fase 7 concluída: recorrências (CRUD, preview de próximas ocorrências, pausar/retomar, "Gerar agora" via service role reusando a função do cron). `services/recurrence.ts` (âncora sem drift) verificado com casos concretos. Decisões 37–38. Build verde (18 rotas). Próxima: Fase 8 — Dashboard.
- **[17/07/26]** — Fase 6 concluída: cartões (CRUD, limite disponível, timeline de faturas), compra no cartão à vista e parcelada (fatura por competência via `get_or_create_invoice`), pagar/reabrir fatura. Migration `0010` (anti-dupla-contagem do pagamento) **pende de `db push`** — só views, sem regen de tipos. Decisões 34–36. Build verde (17 rotas). Próxima: Fase 7 — Recorrentes.
- **[17/07/26]** — Fase 5 concluída: form "Nx" com preview de parcelas, `buildInstallmentPlan()` (âncora sem drift), compra-mãe + parcelas atômicas com rollback, status individual por parcela, exclusão avisando que remove a compra inteira. Decisões 32–33. Build verde (15 rotas). Próxima: Fase 6 — Cartões + Faturas.
- **[17/07/26]** — Fase 4 concluída (parte 2 — anexos): upload direto ao bucket privado com rollback, metadados validados contra a policy de path, download por signed URL de 60 s, exclusão com limpeza do Storage (também no delete de lançamentos/transferências). Core validado manualmente pelo usuário. Próxima: Fase 5 — Parcelamentos.
- **[17/07/26]** — Fase 4 (parte 1) concluída: lista de transações (`v_entries`, keyset + infinite scroll), CRUD via Drawer com tabs, transferência espelhada (criar/editar/status/excluir sempre no par), duplicar, cancelamento. Decisões 29–31. Build verde (15 rotas). Falta anexos no Storage para fechar a fase.
- **[17/07/26]** — Fase 3 concluída: CRUDs de Contas e Categorias (dialogs, arquivamento, exclusão guardada por RESTRICT, saldos derivados via `v_account_balances`), `lib/money.ts`, pickers de cor/ícone, clients Supabase tipados. Decisões 25–28. Build verde (14 rotas). Fase 2 marcada como **aplicada no projeto real** (db push + types pelo usuário). Próxima: Fase 4 — Transações.
- **[17/07/26]** — Correção: `0009_grants.sql` — faltavam `GRANT`s explícitos de tabela para `authenticated` (RLS não substitui privilégio de tabela; Supabase recente não concede mais automaticamente). Encontrado pelo usuário rodando o teste de aceite do `APLICAR.md`. Decisão 24. Revalidado do zero localmente.
- **[17/07/26]** — Fase 2 concluída: 8 migrations + smoke test, validados num Postgres 16 real com ambiente Supabase emulado (RLS com 2 usuários, fatura, recorrência sem drift, backfill). Decisões 17–23 registradas.
- **[16/07/26]** — Fase 1 concluída (auth completo + shell; build verde). Configuração do painel Supabase documentada no README (passo 4). Próxima: Fase 2.
- **[16/07/26]** — Fase 0 concluída (código + build verde). Pendências de conta listadas em "Estado atual". Próxima: Fase 1.
- **[16/07/26]** — Criado. Estado inicial: arquitetura aprovada, nenhum código escrito.

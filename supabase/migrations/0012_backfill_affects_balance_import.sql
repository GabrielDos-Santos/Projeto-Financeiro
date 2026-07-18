-- =============================================================================
-- 0012 · Onboarding com histórico — affects_balance + import em lote (Fase 17)
-- -----------------------------------------------------------------------------
-- Contexto (docs/ARQUITETURA-EXPANSAO-HISTORICO.md): saldo é derivado
-- (decisão 2) — initial_balance_cents + Σ pagas. Ao registrar histórico
-- retroativo (inclusive o pagamento de fatura da decisão 35), esse dinheiro
-- já refletido no saldo inicial seria debitado DE NOVO. Esta migration
-- adiciona uma flag por linha de caixa (`affects_balance`) que separa
-- "conta nos relatórios" (sempre) de "move o saldo atual" (só quando true).
--
-- Reconciliação de numeração: próxima migration livre é 0012 (0001–0011
-- já existem/aplicadas). Decisões novas começam em 55 no CHANGELOG.
-- =============================================================================

-- ─── 1) A flag, nas duas tabelas que alimentam v_entries (decisão 56) ────────
-- Default true: comportamento atual do app não muda para ninguém que não
-- usa a flag — só quem marcar "histórico" explicitamente sai do saldo.
alter table public.transactions
  add column affects_balance boolean not null default true;
alter table public.transaction_installments
  add column affects_balance boolean not null default true;

comment on column public.transactions.affects_balance is
  'false = lançamento histórico (backfill/import/pagamento retroativo): conta nos relatórios por competência, NÃO soma no saldo derivado (já refletido no saldo inicial da conta).';
comment on column public.transaction_installments.affects_balance is
  'Mesma semântica de transactions.affects_balance, por parcela — parcelas já pagas de uma compra reconstruída ficam false; parcelas futuras ficam true.';

-- ─── 2) Rastreio de import (lote + desfazer + dedup) — decisão 61 ────────────
create table public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('account_csv', 'card_csv')),
  account_id      uuid references public.accounts (id) on delete set null,
  credit_card_id  uuid references public.credit_cards (id) on delete set null,
  reference_month date,                       -- competência, quando cartão
  file_name       text not null,
  row_count       int  not null,
  created_at      timestamptz not null default now(),
  constraint import_batches_one_context
    check (num_nonnulls(account_id, credit_card_id) <= 1)
);

alter table public.import_batches enable row level security;

create policy import_batches_select on public.import_batches
  for select to authenticated using (user_id = (select auth.uid()));
create policy import_batches_insert on public.import_batches
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy import_batches_delete on public.import_batches
  for delete to authenticated using (user_id = (select auth.uid()));
-- Sem policy de UPDATE: um lote é escrito uma vez e depois só lido/apagado
-- (desfazer = delete do lote + das transações, nunca edição do lote em si).

-- Grants: cobertos pelo `alter default privileges` da 0009 (decisão 24) —
-- criada pela mesma role que rodou aquele ALTER. Validar no teste de aceite.

alter table public.transactions
  add column import_batch_id uuid references public.import_batches (id) on delete set null,
  add column import_hash text;

comment on column public.transactions.import_hash is
  'sha-256 de contexto|data|valor|descrição normalizada — usado para sinalizar prováveis duplicatas na revisão do import. NÃO é unique: duplicatas legítimas existem (duas tarifas iguais no mesmo dia).';

create index transactions_import_batch_idx
  on public.transactions (import_batch_id) where import_batch_id is not null;
create index transactions_import_hash_idx
  on public.transactions (user_id, import_hash) where import_hash is not null;

-- ─── 3) v_entries — recriada expondo affects_balance ─────────────────────────
-- Linha de transação → transactions.affects_balance;
-- linha de parcela  → transaction_installments.affects_balance (D4: cada
-- parcela é seu próprio evento de caixa — decisão 56).
create or replace view public.v_entries
with (security_invoker = on) as
select
  t.id,
  'transaction'::text        as entry_kind,
  t.id                       as transaction_id,
  null::int                  as installment_number,
  t.user_id,
  t.type,
  t.status,
  t.description,
  t.notes,
  t.amount_cents,
  t.date,
  t.category_id,
  t.account_id,
  t.credit_card_id,
  t.invoice_id,
  t.transfer_group_id,
  t.transfer_direction,
  t.recurring_id,
  t.affects_balance
from public.transactions t
where not t.is_installment_parent

union all

select
  i.id,
  'installment'::text        as entry_kind,
  p.id                       as transaction_id,
  i.installment_number,
  i.user_id,
  p.type,
  i.status,                  -- status é POR PARCELA
  p.description,
  p.notes,
  i.amount_cents,
  i.due_date                 as date,
  p.category_id,
  p.account_id,
  p.credit_card_id,
  i.invoice_id,              -- fatura do mês DA PARCELA
  null::uuid                 as transfer_group_id,
  null::public.transfer_direction as transfer_direction,
  p.recurring_id,
  i.affects_balance          -- flag DA PARCELA, não da mãe
from public.transaction_installments i
join public.transactions p on p.id = i.transaction_id;

-- ─── 4) v_account_balances — recriada respeitando affects_balance ────────────
-- v_monthly_summary, v_budget_usage e v_invoice_totals NÃO mudam (histórico
-- continua contando nos relatórios por competência — requisito 1).
create or replace view public.v_account_balances
with (security_invoker = on) as
select
  a.id   as account_id,
  a.user_id,
  a.name,
  a.type,
  a.color,
  a.icon,
  a.is_archived,
  a.initial_balance_cents,
  (a.initial_balance_cents + coalesce(sum(
    case
      when e.status = 'paid' and e.affects_balance
       and (e.type = 'income' or (e.type = 'transfer' and e.transfer_direction = 'in'))
        then e.amount_cents
      when e.status = 'paid' and e.affects_balance
       and (e.type = 'expense' or (e.type = 'transfer' and e.transfer_direction = 'out'))
        then -e.amount_cents
      else 0
    end
  ), 0))::bigint as balance_cents
from public.accounts a
left join public.v_entries e on e.account_id = a.id
group by a.id;

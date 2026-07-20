-- =============================================================================
-- 0016 · Empréstimos (Fase 18)
-- -----------------------------------------------------------------------------
-- Contexto (docs/ARQUITETURA-EXPANSAO-EMPRESTIMOS.md): `loans` é METADADO de
-- contrato — não guarda dinheiro nem status. Aponta para duas pontas 100%
-- reusadas: o desembolso (1 transação income, opcional) e a dívida (compra-
-- mãe + parcelas de D4, mesmo `buildInstallmentPlan()` da Fase 5). Progresso
-- e saldo devedor são DERIVADOS das parcelas (espírito da D2 — nada
-- armazenado, zero drift).
-- =============================================================================

-- ─── 1) Tabela ───────────────────────────────────────────────────────────────
create table public.loans (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  name                        text not null constraint loans_name_not_blank check (char_length(trim(name)) > 0),
  lender                      text,
  principal_cents             bigint not null constraint loans_principal_positive check (principal_cents > 0),
  total_cents                 bigint not null constraint loans_total_not_less_than_principal check (total_cents >= principal_cents),
  installments_total          int    not null constraint loans_installments_min check (installments_total >= 2),
  interest_rate               numeric(8,4),
  contract_date               date   not null,
  notes                       text,
  -- Pontas financeiras — ver docs/ARQUITETURA-EXPANSAO-EMPRESTIMOS.md:
  disbursement_transaction_id uuid references public.transactions (id) on delete set null,
  parent_transaction_id       uuid not null references public.transactions (id) on delete cascade,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint loans_parent_unique unique (parent_transaction_id)
);

create index loans_user_idx on public.loans (user_id);

create trigger set_loans_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

-- ─── 2) RLS (mesmo template do projeto) ──────────────────────────────────────
-- Escrita own rows; SELECT estendido dono OU admin da casa — consistente com
-- budgets/goals na Fase 16 (decisão 85).
alter table public.loans enable row level security;

create policy "loans_select" on public.loans
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));
create policy "loans_insert_own" on public.loans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "loans_update_own" on public.loans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "loans_delete_own" on public.loans
  for delete to authenticated using (user_id = (select auth.uid()));

-- Grants: cobertos pelo ALTER DEFAULT PRIVILEGES da 0009 (decisão 24).

-- ─── 3) v_monthly_summary — exclui o desembolso do principal ────────────────
-- Mesmo mecanismo anti-dupla-contagem da 0010 (pagamento de fatura, decisão
-- 34): o desembolso É receita para o saldo da conta (caixa, D2 — não muda em
-- v_account_balances), mas NÃO é renda para o relatório do mês — sem isso, um
-- empréstimo de R$ 10.000 apareceria como "receitas do mês: R$ 10.000".
-- v_budget_usage não muda (só olha despesa; desembolso é sempre income).
create or replace view public.v_monthly_summary
with (security_invoker = on) as
select
  user_id,
  date_trunc('month', date)::date as month,
  coalesce(sum(amount_cents) filter (where type = 'income'  and status = 'paid'),    0)::bigint as income_paid_cents,
  coalesce(sum(amount_cents) filter (where type = 'income'  and status = 'pending'), 0)::bigint as income_pending_cents,
  coalesce(sum(amount_cents) filter (where type = 'expense' and status = 'paid'),    0)::bigint as expense_paid_cents,
  coalesce(sum(amount_cents) filter (where type = 'expense' and status = 'pending'), 0)::bigint as expense_pending_cents,
  ( coalesce(sum(amount_cents) filter (where type = 'income'  and status = 'paid'), 0)
  - coalesce(sum(amount_cents) filter (where type = 'expense' and status = 'paid'), 0)
  )::bigint as net_paid_cents
from public.v_entries e
where type <> 'transfer'
  and status <> 'cancelled'
  and transaction_id not in (
    select payment_transaction_id
      from public.credit_card_invoices
     where payment_transaction_id is not null
  )
  and transaction_id not in (
    select disbursement_transaction_id
      from public.loans
     where disbursement_transaction_id is not null
  )
group by 1, 2;

-- ─── 4) Agregados da família — mesma exclusão (Fase 16) ──────────────────────
-- get_household_category_breakdown não muda (só olha type='expense'; o
-- desembolso é sempre income, nunca apareceria ali).
create or replace function public.get_household_monthly_summary(
  p_household uuid,
  p_month     date
)
returns table (
  income_paid_cents     bigint,
  income_pending_cents  bigint,
  expense_paid_cents    bigint,
  expense_pending_cents bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_member_of(p_household) then
    raise exception 'não é membro desta casa';
  end if;

  return query
  with members as (
    select user_id from public.household_members
     where household_id = p_household and status = 'active'
  ),
  entries as (
    select t.type, t.status, t.amount_cents, t.date
      from public.transactions t
     where t.user_id in (select user_id from members)
       and not t.is_installment_parent
       and t.type <> 'transfer'
       and t.status <> 'cancelled'
       and t.id not in (
         select payment_transaction_id from public.credit_card_invoices
          where payment_transaction_id is not null
       )
       and t.id not in (
         select disbursement_transaction_id from public.loans
          where disbursement_transaction_id is not null
       )
    union all
    select p.type, i.status, i.amount_cents, i.due_date as date
      from public.transaction_installments i
      join public.transactions p on p.id = i.transaction_id
     where i.user_id in (select user_id from members)
       and i.status <> 'cancelled'
  )
  select
    coalesce(sum(amount_cents) filter (where type = 'income'  and status = 'paid'),    0)::bigint,
    coalesce(sum(amount_cents) filter (where type = 'income'  and status = 'pending'), 0)::bigint,
    coalesce(sum(amount_cents) filter (where type = 'expense' and status = 'paid'),    0)::bigint,
    coalesce(sum(amount_cents) filter (where type = 'expense' and status = 'pending'), 0)::bigint
  from entries
  where date_trunc('month', date)::date = date_trunc('month', p_month)::date;
end;
$$;

create or replace function public.get_household_monthly_series(
  p_household uuid,
  p_months    int
)
returns table (
  month              date,
  income_paid_cents  bigint,
  expense_paid_cents bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_member_of(p_household) then
    raise exception 'não é membro desta casa';
  end if;
  if p_months < 1 or p_months > 24 then
    raise exception 'intervalo inválido';
  end if;

  return query
  with months as (
    select (date_trunc('month', now())::date - (interval '1 month' * g))::date as m
      from generate_series(0, p_months - 1) g
  ),
  members as (
    select user_id from public.household_members
     where household_id = p_household and status = 'active'
  ),
  entries as (
    select t.type, t.amount_cents, t.date
      from public.transactions t
     where t.user_id in (select user_id from members)
       and not t.is_installment_parent
       and t.type <> 'transfer'
       and t.status = 'paid'
       and t.id not in (
         select payment_transaction_id from public.credit_card_invoices
          where payment_transaction_id is not null
       )
       and t.id not in (
         select disbursement_transaction_id from public.loans
          where disbursement_transaction_id is not null
       )
    union all
    select p.type, i.amount_cents, i.due_date as date
      from public.transaction_installments i
      join public.transactions p on p.id = i.transaction_id
     where i.user_id in (select user_id from members)
       and i.status = 'paid'
  )
  select
    months.m,
    coalesce(sum(e.amount_cents) filter (where e.type = 'income'),  0)::bigint,
    coalesce(sum(e.amount_cents) filter (where e.type = 'expense'), 0)::bigint
  from months
  left join entries e on date_trunc('month', e.date)::date = months.m
  group by months.m
  order by months.m;
end;
$$;

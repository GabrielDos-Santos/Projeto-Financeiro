-- =============================================================================
-- 0019 · Pagamento parcial de fatura
-- -----------------------------------------------------------------------------
-- Contexto: até aqui pagar uma fatura era "tudo ou nada" — uma única despesa
-- pelo valor cheio, `credit_card_invoices.payment_transaction_id` preenchido e
-- fatura `paid`. Agora a fatura pode ser paga em PARTES: cada pagamento é uma
-- despesa na conta (caixa, D5) e a fatura só vira `paid` quando o acumulado
-- atinge o total. O restante fica na MESMA fatura (sem juros/rotativo — decisão
-- de produto desta fase); o limite libera a parte já paga.
--
-- Modelagem: "1 fatura → N pagamentos" não cabe na coluna única
-- `payment_transaction_id` → tabela de ligação `credit_card_invoice_payments`.
-- O total pago é DERIVADO dela (espírito da D2 — nada de saldo armazenado).
-- Não há novo valor no enum `invoice_status`: "parcialmente paga" é derivado
-- (0 < paid_cents < total_cents) na aplicação.
--
-- Anti-dupla-contagem (mesma regra da 0010/0016): a despesa de pagamento debita
-- a conta mas NÃO conta nos relatórios por categoria/mês (a compra já conta por
-- competência). O pagamento TOTAL já era excluído por `payment_transaction_id`;
-- os pagamentos PARCIAIS passam a ser excluídos por estarem em
-- `credit_card_invoice_payments`. Mantemos a cláusula antiga (dados/faturas já
-- pagas e o settle histórico do import continuam válidos sem backfill).
--
-- Pende `db push` + `db:types` (tabela nova + coluna nova em v_invoice_totals).
-- =============================================================================

-- ─── 1) Tabela de pagamentos da fatura ───────────────────────────────────────
-- Cada linha liga a despesa de pagamento (transactions) à fatura, com o valor
-- aplicado. transaction_id único: uma despesa é pagamento de no máximo 1 fatura.
create table public.credit_card_invoice_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid   not null references public.profiles (id) on delete cascade,
  invoice_id      uuid   not null references public.credit_card_invoices (id) on delete cascade,
  transaction_id  uuid   not null references public.transactions (id) on delete cascade,
  amount_cents    bigint not null
                  constraint invoice_payments_amount_positive check (amount_cents > 0),
  created_at      timestamptz not null default now(),
  constraint invoice_payments_transaction_unique unique (transaction_id)
);

create index idx_invoice_payments_invoice on public.credit_card_invoice_payments (invoice_id);
create index idx_invoice_payments_user    on public.credit_card_invoice_payments (user_id);

-- ─── 2) RLS (mesmo template estendido de família — decisão 85) ───────────────
-- SELECT: dono OU admin da casa (consistente com credit_card_invoices/loans);
-- escrita sempre nas próprias linhas.
alter table public.credit_card_invoice_payments enable row level security;

create policy "invoice_payments_select" on public.credit_card_invoice_payments
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));
create policy "invoice_payments_insert_own" on public.credit_card_invoice_payments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "invoice_payments_update_own" on public.credit_card_invoice_payments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "invoice_payments_delete_own" on public.credit_card_invoice_payments
  for delete to authenticated using (user_id = (select auth.uid()));

-- Grants: cobertos pelo ALTER DEFAULT PRIVILEGES da 0009 (decisão 24).

-- ─── 3) v_invoice_totals — expõe paid_cents (soma dos pagamentos) ────────────
-- Subquery agregada ANTES do join (evita produto cartesiano com os itens da
-- fatura). paid_cents é appendado no fim (create or replace view só permite
-- ACRESCENTAR colunas). restante = total_cents - paid_cents (derivado no app).
create or replace view public.v_invoice_totals
with (security_invoker = on) as
select
  i.id  as invoice_id,
  i.user_id,
  i.credit_card_id,
  i.reference_month,
  i.closing_date,
  i.due_date,
  i.status,
  i.payment_transaction_id,
  i.paid_at,
  coalesce(sum(e.amount_cents) filter (where e.status <> 'cancelled'), 0)::bigint as total_cents,
  count(e.id) filter (where e.status <> 'cancelled')                              as items_count,
  coalesce(p.paid_cents, 0)::bigint                                              as paid_cents
from public.credit_card_invoices i
left join public.v_entries e on e.invoice_id = i.id
left join (
  select invoice_id, sum(amount_cents) as paid_cents
    from public.credit_card_invoice_payments
   group by invoice_id
) p on p.invoice_id = i.id
group by i.id, p.paid_cents;

-- ─── 4) Limite disponível — subtrai o RESTANTE, não o total ──────────────────
-- Antes: limite − Σ(total das faturas open/closed). Agora: limite − Σ(restante
-- das faturas não pagas) → um pagamento parcial libera limite na hora. Faturas
-- `paid` têm restante 0 (excluídas por status <> 'paid', como antes).
create or replace function public.get_card_available_limit(p_credit_card_id uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select c.limit_cents - coalesce((
           select sum(vt.total_cents - vt.paid_cents)
             from public.v_invoice_totals vt
            where vt.credit_card_id = c.id
              and vt.status <> 'paid'
         ), 0)
    from public.credit_cards c
   where c.id = p_credit_card_id;
$$;

-- ─── 5) Relatórios — excluir também os pagamentos parciais ───────────────────
-- Recria os 5 objetos que descontam a despesa de pagamento, acrescentando a
-- cláusula `not in (credit_card_invoice_payments)` à exclusão que já existia.

-- 5a) v_monthly_summary (base 0016 — mantém exclusão do desembolso de empréstimo)
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
    select transaction_id
      from public.credit_card_invoice_payments
  )
  and transaction_id not in (
    select disbursement_transaction_id
      from public.loans
     where disbursement_transaction_id is not null
  )
group by 1, 2;

-- 5b) v_budget_usage (base 0010)
create or replace view public.v_budget_usage
with (security_invoker = on) as
select
  b.id    as budget_id,
  b.user_id,
  b.category_id,
  c.name  as category_name,
  c.color as category_color,
  c.icon  as category_icon,
  b.month,
  b.amount_cents,
  b.alert_threshold,
  coalesce(s.spent_cents, 0)::bigint as spent_cents,
  round(coalesce(s.spent_cents, 0)::numeric / nullif(b.amount_cents, 0), 4) as usage_ratio,
  (coalesce(s.spent_cents, 0)::numeric / nullif(b.amount_cents, 0)) >= b.alert_threshold as alert_reached
from public.budgets b
join public.categories c on c.id = b.category_id
left join (
  select user_id, category_id, date_trunc('month', date)::date as month,
         sum(amount_cents) as spent_cents
    from public.v_entries
   where type = 'expense'
     and status <> 'cancelled'
     and transaction_id not in (
       select payment_transaction_id
         from public.credit_card_invoices
        where payment_transaction_id is not null
     )
     and transaction_id not in (
       select transaction_id
         from public.credit_card_invoice_payments
     )
   group by 1, 2, 3
) s on s.user_id = b.user_id
   and s.category_id = b.category_id
   and s.month = b.month;

-- 5c) get_household_monthly_summary (base 0016)
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
         select transaction_id from public.credit_card_invoice_payments
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

-- 5d) get_household_category_breakdown (base 0014)
create or replace function public.get_household_category_breakdown(
  p_household uuid,
  p_month     date
)
returns table (
  category_name  text,
  category_color text,
  amount_cents   bigint
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
    select t.category_id, t.amount_cents, t.date
      from public.transactions t
     where t.user_id in (select user_id from members)
       and not t.is_installment_parent
       and t.type = 'expense'
       and t.status <> 'cancelled'
       and t.id not in (
         select payment_transaction_id from public.credit_card_invoices
          where payment_transaction_id is not null
       )
       and t.id not in (
         select transaction_id from public.credit_card_invoice_payments
       )
    union all
    select p.category_id, i.amount_cents, i.due_date as date
      from public.transaction_installments i
      join public.transactions p on p.id = i.transaction_id
     where i.user_id in (select user_id from members)
       and i.status <> 'cancelled'
       and p.type = 'expense'
  )
  select
    coalesce(c.name, 'Sem categoria'),
    max(c.color),
    sum(e.amount_cents)::bigint
  from entries e
  left join public.categories c on c.id = e.category_id
  where date_trunc('month', e.date)::date = date_trunc('month', p_month)::date
  group by coalesce(c.name, 'Sem categoria')
  order by 3 desc;
end;
$$;

-- 5e) get_household_monthly_series (base 0016)
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
         select transaction_id from public.credit_card_invoice_payments
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

-- Grants de execução preservados pelo create or replace (assinatura idêntica);
-- reafirmados por segurança (mesmo bloco da 0014).
revoke execute on function
  public.get_household_monthly_summary(uuid, date),
  public.get_household_category_breakdown(uuid, date),
  public.get_household_monthly_series(uuid, int)
from public, anon;
grant execute on function
  public.get_household_monthly_summary(uuid, date),
  public.get_household_category_breakdown(uuid, date),
  public.get_household_monthly_series(uuid, int)
to authenticated;

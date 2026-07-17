-- =============================================================================
-- 0007 · Views de relatório (ARQUITETURA.md §4.3)
-- Todas com security_invoker = on: a RLS do usuário atravessa a view.
-- =============================================================================

-- ─── v_entries · camada canônica de relatório ────────────────────────────────
-- Transações simples + transferências + PARCELAS individuais.
-- A compra-mãe parcelada fica FORA (senão o valor total duplicaria).
-- Tudo que agrega dinheiro por período lê daqui.
create view public.v_entries
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
  t.recurring_id
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
  p.recurring_id
from public.transaction_installments i
join public.transactions p on p.id = i.transaction_id;

-- ─── v_account_balances · saldo derivado (D2) ────────────────────────────────
-- saldo = inicial + entradas pagas − saídas pagas. Compras no cartão não
-- entram (account_id nulo): quem debita é o pagamento da fatura (D5).
create view public.v_account_balances
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
      when e.status = 'paid'
       and (e.type = 'income' or (e.type = 'transfer' and e.transfer_direction = 'in'))
        then e.amount_cents
      when e.status = 'paid'
       and (e.type = 'expense' or (e.type = 'transfer' and e.transfer_direction = 'out'))
        then -e.amount_cents
      else 0
    end
  ), 0))::bigint as balance_cents
from public.accounts a
left join public.v_entries e on e.account_id = a.id
group by a.id;

-- ─── v_invoice_totals · total calculado da fatura ────────────────────────────
create view public.v_invoice_totals
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
  count(e.id) filter (where e.status <> 'cancelled')                              as items_count
from public.credit_card_invoices i
left join public.v_entries e on e.invoice_id = i.id
group by i.id;

-- ─── v_budget_usage · consumo do orçamento (competência) ─────────────────────
-- Inclui pendentes e compras de cartão pela DATA DA COMPRA (D5).
create view public.v_budget_usage
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
   group by 1, 2, 3
) s on s.user_id = b.user_id
   and s.category_id = b.category_id
   and s.month = b.month;

-- ─── v_monthly_summary · série mensal do dashboard/relatórios ────────────────
create view public.v_monthly_summary
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
from public.v_entries
where type <> 'transfer'
  and status <> 'cancelled'
group by 1, 2;

-- ─── get_card_available_limit ────────────────────────────────────────────────
-- limite disponível = limite − Σ(faturas NÃO pagas: open/closed). Depende de
-- v_invoice_totals, por isso vive aqui e não no 0006. SECURITY INVOKER: RLS
-- do usuário se aplica via view.
create or replace function public.get_card_available_limit(p_credit_card_id uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select c.limit_cents - coalesce((
           select sum(vt.total_cents)
             from public.v_invoice_totals vt
            where vt.credit_card_id = c.id
              and vt.status in ('open', 'closed')
         ), 0)
    from public.credit_cards c
   where c.id = p_credit_card_id;
$$;

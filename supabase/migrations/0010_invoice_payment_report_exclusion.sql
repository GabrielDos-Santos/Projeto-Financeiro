-- =============================================================================
-- 0010 · Pagamento de fatura fora dos relatórios por categoria/mês
-- -----------------------------------------------------------------------------
-- Contexto (Fase 6): pagar uma fatura cria uma transação `expense` na conta
-- escolhida — ela DEVE debitar o saldo da conta (caixa, D5) e por isso aparece
-- em v_entries / v_account_balances normalmente. Mas as compras do cartão já
-- entram nos relatórios por COMPETÊNCIA (data da compra). Se o pagamento também
-- contasse como despesa de categoria/mês, o mesmo dinheiro seria contado duas
-- vezes (uma na compra, outra no pagamento).
--
-- Solução: v_monthly_summary e v_budget_usage passam a IGNORAR as transações
-- que são pagamento de fatura — identificadas por estarem referenciadas em
-- credit_card_invoices.payment_transaction_id. v_account_balances NÃO muda
-- (o pagamento continua debitando a conta) e a transação continua visível na
-- lista /transacoes.
--
-- Só recria views (nenhuma coluna nova) → não precisa regerar database.ts.
-- =============================================================================

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
group by 1, 2;

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
   group by 1, 2, 3
) s on s.user_id = b.user_id
   and s.category_id = b.category_id
   and s.month = b.month;

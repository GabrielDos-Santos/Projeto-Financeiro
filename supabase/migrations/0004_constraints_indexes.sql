-- =============================================================================
-- 0004 · Constraints tardias + índices (ARQUITETURA.md §4.2)
-- =============================================================================

-- FK circular adiada: fatura → transação que a pagou
alter table public.credit_card_invoices
  add constraint invoices_payment_transaction_fk
  foreign key (payment_transaction_id) references public.transactions (id) on delete set null;

-- ─── accounts / categories ───────────────────────────────────────────────────
create index idx_accounts_user            on public.accounts (user_id);
create index idx_categories_user_type     on public.categories (user_id, type);

-- ─── transactions ────────────────────────────────────────────────────────────
create index idx_transactions_user_date     on public.transactions (user_id, date desc);
create index idx_transactions_user_category on public.transactions (user_id, category_id);
create index idx_transactions_user_account  on public.transactions (user_id, account_id);
create index idx_transactions_invoice       on public.transactions (invoice_id) where invoice_id is not null;
create index idx_transactions_transfer      on public.transactions (transfer_group_id) where transfer_group_id is not null;
create index idx_transactions_user_card     on public.transactions (user_id, credit_card_id) where credit_card_id is not null;

-- Idempotência do gerador de recorrências (D6): 1 ocorrência por (template, data)
create unique index uq_transactions_recurring_occurrence
  on public.transactions (recurring_id, date)
  where recurring_id is not null;

-- ─── transaction_installments ────────────────────────────────────────────────
create index idx_installments_user_due  on public.transaction_installments (user_id, due_date);
create index idx_installments_invoice   on public.transaction_installments (invoice_id) where invoice_id is not null;

-- ─── credit_card_invoices ────────────────────────────────────────────────────
create index idx_invoices_user         on public.credit_card_invoices (user_id);
create index idx_invoices_card_status  on public.credit_card_invoices (credit_card_id, status);

-- ─── recurring_transactions ──────────────────────────────────────────────────
create index idx_recurring_user  on public.recurring_transactions (user_id);
-- varredura do job diário: só ativas, ordenadas pelo cursor
create index idx_recurring_next_run on public.recurring_transactions (next_run_date) where is_active;

-- ─── budgets / goals ─────────────────────────────────────────────────────────
create index idx_budgets_user_month on public.budgets (user_id, month);
create index idx_goals_user_status  on public.goals (user_id, status);

-- ─── attachments ─────────────────────────────────────────────────────────────
create index idx_attachments_transaction on public.attachments (transaction_id);
create index idx_attachments_user        on public.attachments (user_id);

-- ─── notifications ───────────────────────────────────────────────────────────
-- índice parcial: badge de não-lidas
create index idx_notifications_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- ─── rate_limits ─────────────────────────────────────────────────────────────
create index idx_rate_limits_key_hit on public.rate_limits (key, hit_at desc);

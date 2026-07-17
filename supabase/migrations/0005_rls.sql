-- =============================================================================
-- 0005 · Row Level Security (ARQUITETURA.md §4.4)
-- Template "own rows" para o role `authenticated`.
-- (select auth.uid()) — e não auth.uid() direto — deixa o Postgres cachear o
-- valor por statement (initplan): diferença real de performance em scans.
-- =============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- sem DELETE: exclusão de conta é via service role (cascade de auth.users)

-- ─── settings ────────────────────────────────────────────────────────────────
alter table public.settings enable row level security;

create policy "settings_select_own" on public.settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "settings_insert_own" on public.settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "settings_update_own" on public.settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─── accounts ────────────────────────────────────────────────────────────────
alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "accounts_insert_own" on public.accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "accounts_update_own" on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "accounts_delete_own" on public.accounts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── categories ──────────────────────────────────────────────────────────────
alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "categories_insert_own" on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "categories_update_own" on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories_delete_own" on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── credit_cards ────────────────────────────────────────────────────────────
alter table public.credit_cards enable row level security;

create policy "credit_cards_select_own" on public.credit_cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "credit_cards_insert_own" on public.credit_cards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "credit_cards_update_own" on public.credit_cards
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "credit_cards_delete_own" on public.credit_cards
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── credit_card_invoices ────────────────────────────────────────────────────
alter table public.credit_card_invoices enable row level security;

create policy "invoices_select_own" on public.credit_card_invoices
  for select to authenticated using (user_id = (select auth.uid()));
create policy "invoices_insert_own" on public.credit_card_invoices
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "invoices_update_own" on public.credit_card_invoices
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "invoices_delete_own" on public.credit_card_invoices
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── transactions ────────────────────────────────────────────────────────────
alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── transaction_installments ────────────────────────────────────────────────
alter table public.transaction_installments enable row level security;

create policy "installments_select_own" on public.transaction_installments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "installments_insert_own" on public.transaction_installments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "installments_update_own" on public.transaction_installments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "installments_delete_own" on public.transaction_installments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── recurring_transactions ──────────────────────────────────────────────────
alter table public.recurring_transactions enable row level security;

create policy "recurring_select_own" on public.recurring_transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recurring_insert_own" on public.recurring_transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "recurring_update_own" on public.recurring_transactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_delete_own" on public.recurring_transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── budgets ─────────────────────────────────────────────────────────────────
alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── goals ───────────────────────────────────────────────────────────────────
alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── attachments ─────────────────────────────────────────────────────────────
alter table public.attachments enable row level security;

create policy "attachments_select_own" on public.attachments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "attachments_insert_own" on public.attachments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "attachments_update_own" on public.attachments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "attachments_delete_own" on public.attachments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── notifications ───────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_insert_own" on public.notifications
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── rate_limits ─────────────────────────────────────────────────────────────
-- RLS ligada e NENHUMA policy: acesso apenas via check_rate_limit() (0006).
-- Sem isso, o próprio usuário poderia apagar os registros do seu limite.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;
revoke all on sequence public.rate_limits_id_seq from public, anon, authenticated;

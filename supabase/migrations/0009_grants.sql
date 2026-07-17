-- =============================================================================
-- 0009 · Grants explícitos (RLS não substitui GRANT)
-- =============================================================================
-- RLS filtra LINHAS; o acesso à TABELA em si (SELECT/INSERT/UPDATE/DELETE) é
-- um privilégio do Postgres, concedido separadamente via GRANT. Projetos
-- Supabase mais recentes não concedem mais isso por padrão para tabelas
-- novas (mudança de segurança da própria Supabase) — sem esta migration,
-- toda query como `authenticated` falha com "permission denied for table X",
-- mesmo com a policy de RLS correta.

grant usage on schema public to authenticated, service_role;

-- Tabelas de domínio: authenticated pode fazer CRUD (RLS decide QUAIS linhas).
grant select, insert, update, delete on
  public.profiles,
  public.settings,
  public.accounts,
  public.categories,
  public.credit_cards,
  public.credit_card_invoices,
  public.recurring_transactions,
  public.transactions,
  public.transaction_installments,
  public.budgets,
  public.goals,
  public.attachments,
  public.notifications
to authenticated;

-- rate_limits: nenhum grant a authenticated (decisão 21) — acesso
-- exclusivamente via check_rate_limit() (SECURITY DEFINER).

-- Views de relatório: somente leitura.
grant select on
  public.v_entries,
  public.v_account_balances,
  public.v_invoice_totals,
  public.v_budget_usage,
  public.v_monthly_summary
to authenticated;

-- service_role (usado em jobs/admin) não passa por RLS, mas ainda precisa do
-- grant de tabela — liberado por completo, incluindo rate_limits.
grant all on all tables in schema public to service_role;

-- Cobre tabelas/views que vierem em fases futuras: sem isso, toda nova
-- tabela exigiria repetir este grant manualmente.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;

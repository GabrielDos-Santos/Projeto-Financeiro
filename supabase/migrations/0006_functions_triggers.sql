-- =============================================================================
-- 0006 · Funções e triggers (ARQUITETURA.md §4.3)
-- Todas com `set search_path = ''` + objetos totalmente qualificados
-- (padrão de segurança do Supabase para evitar hijack de search_path).
-- =============================================================================

-- ─── set_updated_at ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.credit_cards
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recurring_transactions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ─── create_default_categories ───────────────────────────────────────────────
-- Seed de categorias padrão por usuário. Chamada pelo trigger de signup e
-- pelo backfill (0008). Idempotente via unique (user_id, name, type).
create or replace function public.create_default_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, type, color, icon)
  values
    -- despesas
    (p_user_id, 'Alimentação', 'expense', '#f97316', 'utensils'),
    (p_user_id, 'Mercado',     'expense', '#84cc16', 'shopping-cart'),
    (p_user_id, 'Transporte',  'expense', '#3b82f6', 'car'),
    (p_user_id, 'Moradia',     'expense', '#8b5cf6', 'home'),
    (p_user_id, 'Saúde',       'expense', '#ef4444', 'heart-pulse'),
    (p_user_id, 'Educação',    'expense', '#06b6d4', 'graduation-cap'),
    (p_user_id, 'Lazer',       'expense', '#ec4899', 'gamepad-2'),
    (p_user_id, 'Assinaturas', 'expense', '#6366f1', 'repeat'),
    (p_user_id, 'Compras',     'expense', '#f59e0b', 'shopping-bag'),
    (p_user_id, 'Outros',      'expense', '#71717a', 'ellipsis'),
    -- receitas
    (p_user_id, 'Salário',       'income', '#22c55e', 'banknote'),
    (p_user_id, 'Renda extra',   'income', '#10b981', 'laptop'),
    (p_user_id, 'Investimentos', 'income', '#14b8a6', 'trending-up'),
    (p_user_id, 'Outros',        'income', '#71717a', 'circle-plus')
  on conflict (user_id, name, type) do nothing;
$$;

revoke execute on function public.create_default_categories(uuid) from public, anon, authenticated;

-- ─── handle_new_user ─────────────────────────────────────────────────────────
-- Dispara no signup (auth.users): cria profile + settings + categorias padrão.
-- SECURITY DEFINER: o trigger roda no contexto do Auth, que não tem grants em public.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  perform public.create_default_categories(new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── compute_invoice_period ──────────────────────────────────────────────────
-- Algoritmo de competência da fatura (ARQUITETURA.md §4.2, D5):
--   dia(compra) > fechamento → fatura do mês seguinte; senão, do mês corrente.
--   vencimento: dia D do mês de referência; se D <= C, cai no mês seguinte.
create or replace function public.compute_invoice_period(
  p_closing_day int,
  p_due_day     int,
  p_date        date
)
returns table (reference_month date, closing_date date, due_date date)
language sql
immutable
set search_path = ''
as $$
  with ref as (
    select case
      when extract(day from p_date)::int > p_closing_day
        then (date_trunc('month', p_date) + interval '1 month')::date
      else date_trunc('month', p_date)::date
    end as m
  )
  select
    m,
    make_date(extract(year from m)::int, extract(month from m)::int, p_closing_day),
    case
      when p_due_day > p_closing_day
        then make_date(extract(year from m)::int, extract(month from m)::int, p_due_day)
      else make_date(
             extract(year  from m + interval '1 month')::int,
             extract(month from m + interval '1 month')::int,
             p_due_day
           )
    end
  from ref;
$$;

-- ─── get_or_create_invoice ───────────────────────────────────────────────────
-- Upsert da fatura do período de uma compra. SECURITY INVOKER: chamado por uma
-- Server Action, a RLS do usuário se aplica; chamado pelo gerador (definer),
-- roda no contexto dele.
create or replace function public.get_or_create_invoice(
  p_credit_card_id uuid,
  p_purchase_date  date
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_card record;
  v_ref  date;
  v_clo  date;
  v_due  date;
  v_id   uuid;
begin
  select id, user_id, closing_day, due_day
    into v_card
    from public.credit_cards
   where id = p_credit_card_id;

  if not found then
    raise exception 'cartão % não encontrado', p_credit_card_id;
  end if;

  select reference_month, closing_date, due_date
    into v_ref, v_clo, v_due
    from public.compute_invoice_period(v_card.closing_day, v_card.due_day, p_purchase_date);

  insert into public.credit_card_invoices
    (user_id, credit_card_id, reference_month, closing_date, due_date)
  values
    (v_card.user_id, v_card.id, v_ref, v_clo, v_due)
  on conflict (credit_card_id, reference_month) do nothing;

  select id into v_id
    from public.credit_card_invoices
   where credit_card_id = v_card.id
     and reference_month = v_ref;

  return v_id;
end;
$$;

-- ─── advance_occurrence ──────────────────────────────────────────────────────
-- k-ésima ocorrência SEMPRE calculada a partir do start_date (âncora): recorrência
-- mensal criada dia 31 rende 31/01, 28/02, 31/03… sem "drift" para o dia 28.
create or replace function public.advance_occurrence(
  p_start     date,
  p_frequency public.recurrence_freq,
  p_interval  int,
  p_k         int
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'daily'   then p_start + (p_interval * p_k)
    when 'weekly'  then p_start + (7 * p_interval * p_k)
    when 'monthly' then (p_start + make_interval(months => p_interval * p_k))::date
    when 'yearly'  then (p_start + make_interval(years  => p_interval * p_k))::date
  end;
$$;

-- ─── generate_recurring_transactions ─────────────────────────────────────────
-- Materializa toda ocorrência devida (next_run_date <= hoje) como `pending`,
-- com catch-up de períodos perdidos e idempotência garantida pelo índice
-- único parcial (recurring_id, date). Roda via pg_cron (0008) como postgres.
-- EXECUTE revogado de clientes: só o job (e o service role) chamam.
create or replace function public.generate_recurring_transactions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  rt        record;
  occ       date;
  k         int;
  v_invoice uuid;
  v_total   int := 0;
begin
  for rt in
    select *
      from public.recurring_transactions
     where is_active
       and next_run_date <= current_date
       and (end_date is null or next_run_date <= end_date)
     for update skip locked
  loop
    -- posiciona k na primeira ocorrência >= cursor (âncora: start_date)
    k   := 0;
    occ := rt.start_date;
    while occ < rt.next_run_date and k <= 1200 loop
      k   := k + 1;
      occ := public.advance_occurrence(rt.start_date, rt.frequency, rt.interval_count, k);
    end loop;

    -- materializa tudo que está devido
    while occ <= current_date
      and (rt.end_date is null or occ <= rt.end_date)
      and k <= 1200
    loop
      v_invoice := null;
      if rt.credit_card_id is not null then
        v_invoice := public.get_or_create_invoice(rt.credit_card_id, occ);
      end if;

      insert into public.transactions
        (user_id, account_id, credit_card_id, invoice_id, category_id,
         type, status, description, amount_cents, date, recurring_id)
      values
        (rt.user_id, rt.account_id, rt.credit_card_id, v_invoice, rt.category_id,
         rt.type, 'pending', rt.description, rt.amount_cents, occ, rt.id)
      on conflict (recurring_id, date) where recurring_id is not null do nothing;

      v_total := v_total + 1;
      k   := k + 1;
      occ := public.advance_occurrence(rt.start_date, rt.frequency, rt.interval_count, k);
    end loop;

    -- avança o cursor para a primeira ocorrência futura
    update public.recurring_transactions
       set next_run_date = occ
     where id = rt.id;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.generate_recurring_transactions() from public, anon, authenticated;

-- ─── check_rate_limit ────────────────────────────────────────────────────────
-- Janela deslizante em Postgres (ARQUITETURA.md §9). SECURITY DEFINER: a tabela
-- rate_limits não tem policies — clientes só passam por aqui.
-- Uso (server action): select public.check_rate_limit(auth.uid() || ':export', 5, interval '1 hour');
create or replace function public.check_rate_limit(
  p_key      text,
  p_max_hits int,
  p_window   interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.rate_limits
   where key = p_key
     and hit_at < now() - p_window;

  select count(*) into v_count
    from public.rate_limits
   where key = p_key
     and hit_at >= now() - p_window;

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into public.rate_limits (key) values (p_key);
  return true;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, interval) from public, anon;
grant  execute on function public.check_rate_limit(text, int, interval) to authenticated, service_role;

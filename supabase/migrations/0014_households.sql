-- =============================================================================
-- 0014 · Família (households) — Fase 16
-- -----------------------------------------------------------------------------
-- Contexto (docs/ARQUITETURA-EXPANSAO.md, decisões renumeradas 83–88 no
-- CHANGELOG): admin da casa LÊ tudo de todos os membros linha a linha; membro
-- lê agregados da família + contas explicitamente compartilhadas. NINGUÉM
-- escreve dado alheio — INSERT/UPDATE/DELETE continuam "own rows" em todas as
-- tabelas de domínio; esta migration só estende policies de SELECT.
--
-- Regra de ouro anti-recursão: policy que consulta outra tabela com RLS
-- recursaria — toda checagem de parentesco vive em funções SECURITY DEFINER
-- estáveis (set search_path = ''), e as policies só chamam essas funções.
-- =============================================================================

-- ─── 1) Enums ────────────────────────────────────────────────────────────────
create type public.household_role as enum ('admin', 'member');
create type public.member_status  as enum ('active', 'removed');

-- ─── 2) Tabelas ──────────────────────────────────────────────────────────────
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_households_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

create table public.household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.household_role not null default 'member',
  status        public.member_status  not null default 'active',
  joined_at     timestamptz not null default now(),
  constraint household_members_unique unique (household_id, user_id)
);
-- O banco permite múltiplos households por usuário; a UI v1 trabalha com UM
-- (a Server Action bloqueia criar/aceitar quando já há membership ativa).

create index household_members_user_idx
  on public.household_members (user_id, status);
create index household_members_household_idx
  on public.household_members (household_id, role, status);

create table public.household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  email         text not null,
  role          public.household_role not null default 'member',
  token_hash    text not null unique,   -- sha-256 do token; o token cru vai só no link
  invited_by    uuid not null references public.profiles (id),
  expires_at    timestamptz not null,   -- app envia now() + 7 dias
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index household_invites_household_idx
  on public.household_invites (household_id);

create table public.household_shared_accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,
  shared_by     uuid not null references public.profiles (id),
  created_at    timestamptz not null default now(),
  constraint shared_accounts_unique unique (household_id, account_id)
);

create index household_shared_accounts_account_idx
  on public.household_shared_accounts (account_id);

-- ─── 3) Funções de parentesco (SECURITY DEFINER, anti-recursão) ──────────────
-- STABLE: avaliadas uma vez por statement quando possível. EXECUTE só para
-- authenticated — anon não tem por que perguntar parentesco.

create or replace function public.is_member_of(p_household uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.household_members m
     where m.household_id = p_household
       and m.user_id = (select auth.uid())
       and m.status = 'active'
  );
$$;

create or replace function public.is_admin_of(p_household uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.household_members m
     where m.household_id = p_household
       and m.user_id = (select auth.uid())
       and m.role = 'admin'
       and m.status = 'active'
  );
$$;

-- current user é admin ATIVO de algum household que contém p_user (ativo)?
create or replace function public.is_admin_over(p_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.household_members me
      join public.household_members them
        on them.household_id = me.household_id
     where me.user_id = (select auth.uid())
       and me.role = 'admin'
       and me.status = 'active'
       and them.user_id = p_user
       and them.status = 'active'
  );
$$;

-- a conta p_account está compartilhada com algum household do current user?
create or replace function public.account_shared_with_me(p_account uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.household_shared_accounts sa
      join public.household_members m
        on m.household_id = sa.household_id
     where sa.account_id = p_account
       and m.user_id = (select auth.uid())
       and m.status = 'active'
  );
$$;

-- a conta pertence a um membro ativo do household? (guarda do compartilhar)
create or replace function public.account_owned_by_member_of(
  p_account uuid, p_household uuid
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.accounts a
      join public.household_members m on m.user_id = a.user_id
     where a.id = p_account
       and m.household_id = p_household
       and m.status = 'active'
  );
$$;

-- current user e p_user dividem algum household ativo? (nome/avatar dos
-- membros na tela /familia — profiles é own-rows e ninguém veria os colegas)
create or replace function public.shares_household_with(p_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.household_members me
      join public.household_members them
        on them.household_id = me.household_id
     where me.user_id = (select auth.uid())
       and me.status = 'active'
       and them.user_id = p_user
       and them.status = 'active'
  );
$$;

revoke execute on function
  public.is_member_of(uuid),
  public.is_admin_of(uuid),
  public.is_admin_over(uuid),
  public.account_shared_with_me(uuid),
  public.account_owned_by_member_of(uuid, uuid),
  public.shares_household_with(uuid)
from public, anon;
grant execute on function
  public.is_member_of(uuid),
  public.is_admin_of(uuid),
  public.is_admin_over(uuid),
  public.account_shared_with_me(uuid),
  public.account_owned_by_member_of(uuid, uuid),
  public.shares_household_with(uuid)
to authenticated;

-- ─── 4) Fluxos que não cabem em policy (SECURITY DEFINER) ────────────────────
-- Criar casa e aceitar convite inserem em household_members — mas uma policy
-- de INSERT "user_id = uid" deixaria qualquer um se enfiar em qualquer casa.
-- Por isso household_members NÃO tem policy de INSERT: só estas funções
-- (validadas) inserem.

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'nome inválido';
  end if;
  -- v1: uma casa por usuário (a UI também bloqueia; defesa em profundidade).
  if exists (
    select 1 from public.household_members
     where user_id = v_uid and status = 'active'
  ) then
    raise exception 'usuário já pertence a uma casa';
  end if;

  insert into public.households (name, created_by)
  values (v_name, v_uid)
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, v_uid, 'admin');

  return v_id;
end;
$$;

-- Tela de consentimento do convite: quem tem o token (o link) pode ler o
-- nome da casa e o e-mail convidado ANTES de aceitar. O token cru nunca
-- toca o banco — o app envia o sha-256.
create or replace function public.get_invite_details(p_token_hash text)
returns table (
  household_id   uuid,
  household_name text,
  email          text,
  role           public.household_role,
  expires_at     timestamptz,
  accepted_at    timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select i.household_id, h.name, i.email, i.role, i.expires_at, i.accepted_at
    from public.household_invites i
    join public.households h on h.id = i.household_id
   where i.token_hash = p_token_hash;
$$;

create or replace function public.accept_household_invite(p_token_hash text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_invite record;
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;

  select * into v_invite
    from public.household_invites
   where token_hash = p_token_hash
   for update;

  if not found then
    raise exception 'convite não encontrado';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'convite já utilizado';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'convite expirado';
  end if;
  -- v1: uma casa por usuário.
  if exists (
    select 1 from public.household_members
     where user_id = v_uid and status = 'active'
  ) then
    raise exception 'usuário já pertence a uma casa';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_uid, v_invite.role)
  on conflict (household_id, user_id)
  do update set status = 'active', role = excluded.role;

  update public.household_invites
     set accepted_at = now()
   where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

revoke execute on function
  public.create_household(text),
  public.get_invite_details(text),
  public.accept_household_invite(text)
from public, anon;
grant execute on function
  public.create_household(text),
  public.get_invite_details(text),
  public.accept_household_invite(text)
to authenticated;

-- ─── 5) RLS das tabelas novas ────────────────────────────────────────────────
alter table public.households enable row level security;

create policy households_select on public.households
  for select to authenticated
  using (public.is_member_of(id) or created_by = (select auth.uid()));
create policy households_update on public.households
  for update to authenticated
  using (public.is_admin_of(id)) with check (public.is_admin_of(id));
create policy households_delete on public.households
  for delete to authenticated using (public.is_admin_of(id));
-- INSERT só via create_household() (definer).

alter table public.household_members enable row level security;

create policy household_members_select on public.household_members
  for select to authenticated using (public.is_member_of(household_id));
-- Sair (delete da própria linha) OU admin removendo membro.
create policy household_members_delete on public.household_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_of(household_id));
-- INSERT só via create_household()/accept_household_invite() (definer).
-- UPDATE (trocar papel) fica para evolução.

alter table public.household_invites enable row level security;

create policy household_invites_select on public.household_invites
  for select to authenticated using (public.is_admin_of(household_id));
create policy household_invites_insert on public.household_invites
  for insert to authenticated
  with check (
    public.is_admin_of(household_id)
    and invited_by = (select auth.uid())
  );
create policy household_invites_delete on public.household_invites
  for delete to authenticated using (public.is_admin_of(household_id));
-- UPDATE (accepted_at) só via accept_household_invite() (definer).

alter table public.household_shared_accounts enable row level security;

create policy household_shared_accounts_select on public.household_shared_accounts
  for select to authenticated using (public.is_member_of(household_id));
create policy household_shared_accounts_insert on public.household_shared_accounts
  for insert to authenticated
  with check (
    public.is_admin_of(household_id)
    and shared_by = (select auth.uid())
    and public.account_owned_by_member_of(account_id, household_id)
  );
create policy household_shared_accounts_delete on public.household_shared_accounts
  for delete to authenticated using (public.is_admin_of(household_id));

-- Grants das tabelas novas: cobertos pelo ALTER DEFAULT PRIVILEGES da 0009.

-- ─── 6) SELECT estendido nas tabelas de domínio ──────────────────────────────
-- Escrita continua estritamente "own rows" — só o SELECT muda. Views
-- security_invoker (v_entries, v_account_balances…) herdam automaticamente.

drop policy "accounts_select_own" on public.accounts;
create policy "accounts_select" on public.accounts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin_over(user_id)
    or public.account_shared_with_me(id)
  );

drop policy "transactions_select_own" on public.transactions;
create policy "transactions_select" on public.transactions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin_over(user_id)
    or (account_id is not null and public.account_shared_with_me(account_id))
  );

drop policy "installments_select_own" on public.transaction_installments;
create policy "installments_select" on public.transaction_installments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin_over(user_id)
    -- Parcela de compra em CONTA compartilhada: a conta está na mãe.
    -- O subselect roda sob a RLS de transactions do próprio usuário —
    -- membro só enxerga a mãe se a conta for compartilhada (sem recursão:
    -- a cláusula de transactions usa funções definer, não volta aqui).
    or exists (
      select 1
        from public.transactions t
       where t.id = transaction_id
         and t.account_id is not null
         and public.account_shared_with_me(t.account_id)
    )
  );

drop policy "categories_select_own" on public.categories;
create policy "categories_select" on public.categories
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));

drop policy "credit_cards_select_own" on public.credit_cards;
create policy "credit_cards_select" on public.credit_cards
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));

drop policy "invoices_select_own" on public.credit_card_invoices;
create policy "invoices_select" on public.credit_card_invoices
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));

drop policy "budgets_select_own" on public.budgets;
create policy "budgets_select" on public.budgets
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));

drop policy "goals_select_own" on public.goals;
create policy "goals_select" on public.goals
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_over(user_id));

-- profiles: membros da mesma casa se enxergam (nome/avatar na lista de
-- membros); escrita continua own-rows.
drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_household_with(id));

-- ─── 7) Agregados da família (SECURITY DEFINER com guarda de membership) ─────
-- RLS não sabe dar "a soma sem as linhas" — membro comum não enxerga as
-- linhas dos outros, mas o dashboard da família mostra totais. Função
-- DEFINER valida is_member_of() na primeira linha e agrega por cima da RLS.
-- Nunca VIEW security definer (não teria como filtrar por membership).
--
-- Semântica espelha v_monthly_summary/0010: por competência, sem transfer,
-- sem canceladas, excluindo transações de pagamento de fatura (anti-dupla-
-- contagem) e com a mãe parcelada fora (cada parcela conta no seu mês).

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

-- Gasto por categoria (nome+cor), casa inteira, sem expor conta/membro.
-- Categorias são por usuário: mesmo NOME em usuários diferentes agrega junto
-- (é a leitura natural de "Alimentação da casa"); a cor é a de qualquer um.
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

-- Série mensal (pagos) para o gráfico do dashboard da família.
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

-- =============================================================================
-- 0003 · Tabelas (ARQUITETURA.md §4.2)
-- Ordem respeita as dependências de FK. A FK circular
-- credit_card_invoices.payment_transaction_id → transactions entra no 0004.
-- =============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Extensão 1:1 de auth.users. Criada pelo trigger handle_new_user (0006).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── settings ────────────────────────────────────────────────────────────────
create table public.settings (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  theme                 text not null default 'dark'
                        constraint settings_theme_valid check (theme in ('light','dark','system')),
  currency              char(3) not null default 'BRL',
  locale                text not null default 'pt-BR',
  notify_budget_alerts  boolean not null default true,
  notify_invoice_due    boolean not null default true,
  updated_at            timestamptz not null default now()
);

-- ─── accounts ────────────────────────────────────────────────────────────────
-- Saldo NÃO é armazenado (D2): derivado em v_account_balances (0007).
create table public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  name                   text not null,
  type                   public.account_type not null,
  initial_balance_cents  bigint not null default 0,
  color                  text,
  icon                   text,
  is_archived            boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint accounts_name_unique unique (user_id, name)
);

-- ─── categories ──────────────────────────────────────────────────────────────
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  type         public.category_type not null,
  color        text,
  icon         text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint categories_name_unique unique (user_id, name, type)
);

-- ─── credit_cards ────────────────────────────────────────────────────────────
-- Dias limitados a 1–28 (premissa aprovada — evita ambiguidade em fevereiro).
-- Melhor dia de compra e limite disponível são DERIVADOS (0007).
create table public.credit_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  bank         text,
  limit_cents  bigint not null constraint credit_cards_limit_positive check (limit_cents > 0),
  closing_day  int not null constraint credit_cards_closing_day_range check (closing_day between 1 and 28),
  due_day      int not null constraint credit_cards_due_day_range check (due_day between 1 and 28),
  color        text,
  icon         text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint credit_cards_name_unique unique (user_id, name)
);

-- ─── credit_card_invoices ────────────────────────────────────────────────────
-- Total é CALCULADO (v_invoice_totals, 0007) — nunca armazenado.
create table public.credit_card_invoices (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  credit_card_id          uuid not null references public.credit_cards (id) on delete cascade,
  reference_month         date not null
                          constraint invoices_reference_month_first_day
                          check (reference_month = date_trunc('month', reference_month)::date),
  closing_date            date not null,
  due_date                date not null,
  status                  public.invoice_status not null default 'open',
  payment_transaction_id  uuid, -- FK adicionada no 0004 (dependência circular)
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  constraint invoices_card_month_unique unique (credit_card_id, reference_month)
);

-- ─── recurring_transactions ──────────────────────────────────────────────────
-- Template das recorrências (D6). Coluna de intervalo chama-se interval_count
-- ("interval" é palavra reservada no Postgres). "Personalizado" =
-- frequency × interval_count (ex.: a cada 2 semanas = weekly + 2).
create table public.recurring_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  description     text not null constraint recurring_description_not_blank check (char_length(trim(description)) > 0),
  amount_cents    bigint not null constraint recurring_amount_positive check (amount_cents > 0),
  type            public.transaction_type not null
                  constraint recurring_type_no_transfer check (type in ('income','expense')),
  category_id     uuid not null references public.categories (id) on delete restrict,
  account_id      uuid references public.accounts (id) on delete restrict,
  credit_card_id  uuid references public.credit_cards (id) on delete restrict,
  frequency       public.recurrence_freq not null,
  interval_count  int not null default 1 constraint recurring_interval_positive check (interval_count >= 1),
  start_date      date not null,
  end_date        date,
  next_run_date   date not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint recurring_owner_exactly_one check (num_nonnulls(account_id, credit_card_id) = 1),
  constraint recurring_card_expense_only check (credit_card_id is null or type = 'expense'),
  constraint recurring_dates_coherent check (next_run_date >= start_date and (end_date is null or end_date >= start_date))
);

-- ─── transactions ────────────────────────────────────────────────────────────
-- Coração do sistema (D2–D5). Cada linha tem exatamente UM dono: conta OU cartão.
create table public.transactions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  account_id             uuid references public.accounts (id) on delete restrict,
  credit_card_id         uuid references public.credit_cards (id) on delete restrict,
  invoice_id             uuid references public.credit_card_invoices (id) on delete restrict,
  category_id            uuid references public.categories (id) on delete restrict,
  type                   public.transaction_type not null,
  status                 public.transaction_status not null default 'pending',
  description            text not null constraint transactions_description_not_blank check (char_length(trim(description)) > 0),
  notes                  text,
  amount_cents           bigint not null constraint transactions_amount_positive check (amount_cents > 0),
  date                   date not null,
  paid_at                timestamptz,
  transfer_group_id      uuid,
  transfer_direction     public.transfer_direction,
  recurring_id           uuid references public.recurring_transactions (id) on delete set null,
  is_installment_parent  boolean not null default false,
  installments_total     int,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- exatamente um dono
  constraint transactions_owner_exactly_one
    check (num_nonnulls(account_id, credit_card_id) = 1),

  -- compra em cartão é sempre despesa (estorno/crédito em fatura: evolução futura)
  -- e sempre pertence a uma fatura
  constraint transactions_card_shape
    check (credit_card_id is null or (type = 'expense' and invoice_id is not null)),
  constraint transactions_invoice_requires_card
    check (invoice_id is null or credit_card_id is not null),

  -- forma da transferência (D3): par espelhado com direção; sem categoria; nunca em cartão
  constraint transactions_transfer_shape
    check (
      (type = 'transfer'
        and category_id is null
        and credit_card_id is null
        and transfer_group_id is not null
        and transfer_direction is not null)
      or
      (type <> 'transfer'
        and transfer_group_id is null
        and transfer_direction is null)
    ),

  -- categoria obrigatória fora de transferências
  constraint transactions_category_required
    check (type = 'transfer' or category_id is not null),

  -- forma do parcelamento (D4)
  constraint transactions_installment_shape
    check (
      (is_installment_parent and installments_total >= 2)
      or
      (not is_installment_parent and installments_total is null)
    )
);

-- ─── transaction_installments ────────────────────────────────────────────────
-- Parcelas da compra-mãe (D4). user_id denormalizado p/ RLS e índices diretos.
create table public.transaction_installments (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid not null references public.transactions (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  installment_number  int not null constraint installments_number_positive check (installment_number >= 1),
  amount_cents        bigint not null constraint installments_amount_positive check (amount_cents > 0),
  due_date            date not null,
  status              public.transaction_status not null default 'pending',
  invoice_id          uuid references public.credit_card_invoices (id) on delete restrict,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  constraint installments_number_unique unique (transaction_id, installment_number)
);

-- ─── budgets ─────────────────────────────────────────────────────────────────
create table public.budgets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  category_id      uuid not null references public.categories (id) on delete cascade,
  month            date not null
                   constraint budgets_month_first_day check (month = date_trunc('month', month)::date),
  amount_cents     bigint not null constraint budgets_amount_positive check (amount_cents > 0),
  alert_threshold  numeric(3,2) not null default 0.80
                   constraint budgets_threshold_range check (alert_threshold between 0.05 and 1.00),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint budgets_user_category_month_unique unique (user_id, category_id, month)
);

-- ─── goals ───────────────────────────────────────────────────────────────────
create table public.goals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  name                  text not null,
  description           text,
  target_amount_cents   bigint not null constraint goals_target_positive check (target_amount_cents > 0),
  current_amount_cents  bigint not null default 0 constraint goals_current_non_negative check (current_amount_cents >= 0),
  target_date           date,
  color                 text,
  icon                  text,
  status                public.goal_status not null default 'active',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── attachments ─────────────────────────────────────────────────────────────
-- Metadados; binário no Storage (bucket `attachments`, path user_id/transaction_id/uuid.ext).
create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  transaction_id  uuid not null references public.transactions (id) on delete cascade,
  file_name       text not null,
  storage_path    text not null unique,
  mime_type       text not null
                  constraint attachments_mime_whitelist check (mime_type in
                    ('image/jpeg','image/png','image/webp','image/gif','application/pdf')),
  size_bytes      int not null constraint attachments_size_limit check (size_bytes between 1 and 10485760),
  created_at      timestamptz not null default now()
);

-- ─── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  metadata    jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── rate_limits ─────────────────────────────────────────────────────────────
-- Infra de rate limit em Postgres (ARQUITETURA.md §9) — SEM policies de RLS:
-- acesso exclusivamente via check_rate_limit() (security definer, 0006).
create table public.rate_limits (
  id      bigint generated always as identity primary key,
  key     text not null,
  hit_at  timestamptz not null default now()
);

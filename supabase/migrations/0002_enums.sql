-- =============================================================================
-- 0002 · Enums (ARQUITETURA.md §4.1)
-- =============================================================================

create type public.account_type       as enum ('bank','wallet','cash','investment','digital');
create type public.category_type      as enum ('income','expense');
create type public.transaction_type   as enum ('income','expense','transfer');
create type public.transaction_status as enum ('paid','pending','cancelled');
create type public.invoice_status     as enum ('open','closed','paid');
create type public.recurrence_freq    as enum ('daily','weekly','monthly','yearly');
create type public.goal_status        as enum ('active','completed','archived');
create type public.notification_type  as enum ('budget_alert','invoice_due','goal_reached','system');

-- Decisão de Fase 2: o par espelhado da transferência (D3) precisa distinguir
-- a perna de saída da de entrada — o DER original não tinha essa informação.
create type public.transfer_direction as enum ('in','out');

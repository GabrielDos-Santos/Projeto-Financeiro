-- =============================================================================
-- 0017 · Notificações push — vencimento de fatura e parcela de empréstimo
-- (Fase 19)
-- -----------------------------------------------------------------------------
-- Ativa `settings.notify_invoice_due` (dormant desde a Fase 2 — nunca teve
-- efeito real) e adiciona o par simétrico para empréstimo. Nova tabela
-- `push_subscriptions` (uma linha por dispositivo/navegador assinado via
-- Web Push/VAPID). O job diário que efetivamente varre vencimentos e envia
-- os pushes roda fora do banco (Vercel Cron chamando uma Route Handler —
-- decisão 103, docs/ARQUITETURA-EXPANSAO-PUSH.md) usando a service role.
-- =============================================================================

-- ─── 1) settings: toggle simétrico ao já existente notify_invoice_due ────────
alter table public.settings
  add column notify_loan_due boolean not null default true;

-- ─── 2) notifications: novo tipo (enum já existia desde a Fase 2) ───────────
alter type public.notification_type add value 'loan_due';

-- ─── 3) push_subscriptions ────────────────────────────────────────────────
-- Estritamente por dispositivo/pessoa — RLS own rows, sem is_admin_over
-- (não faz sentido um admin de família gerenciar o celular de outro membro).
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
-- UPDATE existe só para o upsert (endpoint reassinado) resolver o conflito
-- de unicidade sem apagar+recriar a linha (`subscribeToPush`, decisão 102).

-- Grants: cobertos pelo ALTER DEFAULT PRIVILEGES da 0009 (decisão 24). O job
-- de cron lê TODAS as assinaturas via service role (bypassa RLS de propósito
-- — mesmo padrão de generate_recurring_transactions, decisão 38).

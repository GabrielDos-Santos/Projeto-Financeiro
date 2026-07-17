-- =============================================================================
-- SMOKE TEST · Fase 2 — SOMENTE BANCO LOCAL/DE ESTUDO.
-- ⚠️  NUNCA rode no projeto Supabase real: insere linhas diretamente em
--     auth.users e dados fictícios em todas as tabelas.
-- Para validar RLS no projeto hospedado, use o snippet seguro do APLICAR.md.
-- Falha = erro (asserts); sucesso = termina com "SMOKE FASE 2: OK".
-- =============================================================================

-- Scratch compartilhado entre blocos/roles
create temp table _t (k text primary key, v text);
grant all on _t to public;

-- ─── 1. Signup: trigger cria profile + settings + 14 categorias ─────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'gabriel@test.com', '{"full_name":"Gabriel Teste"}'),
  ('22222222-2222-2222-2222-222222222222', 'outra@test.com',   '{}');

do $$
begin
  assert (select count(*) from public.profiles) >= 2, 'profiles não criados pelo trigger';
  assert (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'Gabriel Teste',
    'full_name do metadata não aplicado';
  assert (select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 'outra',
    'fallback de full_name (prefixo do e-mail) não aplicado';
  assert (select count(*) from public.settings  where user_id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')) = 2,
    'settings não criados';
  assert (select count(*) from public.categories where user_id = '11111111-1111-1111-1111-111111111111') = 14,
    'u1 sem as 14 categorias padrão';
  assert (select count(*) from public.categories where user_id = '22222222-2222-2222-2222-222222222222') = 14,
    'u2 sem as 14 categorias padrão';
end $$;

-- ─── 2. Contexto do usuário 1 (como o PostgREST faz) ─────────────────────────
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

-- contas
do $$
declare a1 uuid; a2 uuid;
begin
  insert into public.accounts (user_id, name, type, initial_balance_cents)
    values ('11111111-1111-1111-1111-111111111111', 'Nubank', 'bank', 100000)
    returning id into a1;
  insert into public.accounts (user_id, name, type, initial_balance_cents)
    values ('11111111-1111-1111-1111-111111111111', 'Carteira', 'wallet', 0)
    returning id into a2;
  insert into _t values ('a1', a1::text), ('a2', a2::text);

  insert into _t
  select 'cat_alimentacao', id::text from public.categories
   where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Alimentação' and type = 'expense';
  insert into _t
  select 'cat_salario', id::text from public.categories
   where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Salário' and type = 'income';
  insert into _t
  select 'cat_compras', id::text from public.categories
   where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Compras' and type = 'expense';
end $$;

-- transações simples + transferência espelhada (D3)
do $$
declare
  a1 uuid := (select v from _t where k = 'a1');
  a2 uuid := (select v from _t where k = 'a2');
  c_ali uuid := (select v from _t where k = 'cat_alimentacao');
  c_sal uuid := (select v from _t where k = 'cat_salario');
  g uuid := gen_random_uuid();
begin
  -- receita paga
  insert into public.transactions (user_id, account_id, category_id, type, status, description, amount_cents, date, paid_at)
  values ('11111111-1111-1111-1111-111111111111', a1, c_sal, 'income', 'paid', 'Salário julho', 500000, '2026-07-05', now());
  -- despesa paga
  insert into public.transactions (user_id, account_id, category_id, type, status, description, amount_cents, date, paid_at)
  values ('11111111-1111-1111-1111-111111111111', a1, c_ali, 'expense', 'paid', 'Mercado', 120000, '2026-07-08', now());
  -- despesa pendente (não entra no saldo)
  insert into public.transactions (user_id, account_id, category_id, type, status, description, amount_cents, date)
  values ('11111111-1111-1111-1111-111111111111', a1, c_ali, 'expense', 'pending', 'Delivery agendado', 30000, '2026-07-20');
  -- transferência A1 → A2 (par espelhado)
  insert into public.transactions (user_id, account_id, type, status, description, amount_cents, date, transfer_group_id, transfer_direction, paid_at)
  values
    ('11111111-1111-1111-1111-111111111111', a1, 'transfer', 'paid', 'Transferência p/ carteira', 50000, '2026-07-10', g, 'out', now()),
    ('11111111-1111-1111-1111-111111111111', a2, 'transfer', 'paid', 'Transferência p/ carteira', 50000, '2026-07-10', g, 'in',  now());
end $$;

-- saldos derivados (D2 + D3)
do $$
begin
  assert (select balance_cents from public.v_account_balances where account_id = (select v from _t where k='a1')::uuid) = 430000,
    'saldo A1 incorreto (esperado 430000 = 100000 + 500000 − 120000 − 50000)';
  assert (select balance_cents from public.v_account_balances where account_id = (select v from _t where k='a2')::uuid) = 50000,
    'saldo A2 incorreto (esperado 50000)';
end $$;

-- ─── 3. RLS cross-tenant: usuário 2 não vê nem escreve nada do usuário 1 ────
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);

do $$
begin
  assert (select count(*) from public.transactions) = 0, 'RLS FALHOU: u2 enxerga transações de u1';
  assert (select count(*) from public.accounts)     = 0, 'RLS FALHOU: u2 enxerga contas de u1';
  assert (select count(*) from public.v_entries)    = 0, 'RLS FALHOU: u2 enxerga v_entries de u1 (security_invoker)';
end $$;

-- gravar com user_id alheio deve estourar 42501
do $$
begin
  insert into public.transactions (user_id, account_id, category_id, type, status, description, amount_cents, date)
  values ('11111111-1111-1111-1111-111111111111',
          (select v from _t where k='a1')::uuid,
          (select v from _t where k='cat_alimentacao')::uuid,
          'expense', 'paid', 'invasão', 100, '2026-07-01');
  raise exception 'RLS FALHOU: insert cross-tenant foi aceito';
exception
  when insufficient_privilege then null; -- 42501 esperado
end $$;

-- ─── 4. Parcelamento (D4): mãe fora do relatório, parcelas dentro ────────────
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

do $$
declare parent uuid;
begin
  insert into public.transactions (user_id, account_id, category_id, type, status, description,
                                   amount_cents, date, is_installment_parent, installments_total)
  values ('11111111-1111-1111-1111-111111111111',
          (select v from _t where k='a1')::uuid,
          (select v from _t where k='cat_compras')::uuid,
          'expense', 'pending', 'Notebook 12x', 360000, '2026-07-01', true, 12)
  returning id into parent;
  insert into _t values ('parent', parent::text);

  insert into public.transaction_installments (transaction_id, user_id, installment_number, amount_cents, due_date)
  select parent, '11111111-1111-1111-1111-111111111111', gs, 30000,
         (date '2026-07-10' + make_interval(months => gs - 1))::date
    from generate_series(1, 12) gs;
end $$;

do $$
begin
  assert (select count(*) from public.v_entries where transaction_id = (select v from _t where k='parent')::uuid) = 12,
    'v_entries deveria ter as 12 parcelas';
  assert not exists (select 1 from public.v_entries where id = (select v from _t where k='parent')::uuid),
    'v_entries NÃO deveria conter a compra-mãe';
  assert (select count(*) from public.v_entries) = 17,
    'v_entries de u1 deveria ter 17 linhas (3 tx + 2 pernas + 12 parcelas)';
  -- competência de julho: 30000 (delivery pendente) + 30000 (parcela 1) = 60000
  assert (select expense_pending_cents from public.v_monthly_summary
           where user_id = '11111111-1111-1111-1111-111111111111' and month = '2026-07-01') = 60000,
    'expense_pending de julho incorreto (esperado 60000)';
  assert (select income_paid_cents from public.v_monthly_summary
           where user_id = '11111111-1111-1111-1111-111111111111' and month = '2026-07-01') = 500000,
    'income_paid de julho incorreto';
  assert (select expense_paid_cents from public.v_monthly_summary
           where user_id = '11111111-1111-1111-1111-111111111111' and month = '2026-07-01') = 120000,
    'expense_paid de julho incorreto (transferência não pode contar)';
  -- saldo continua igual: parcelas pendentes não movem caixa
  assert (select balance_cents from public.v_account_balances where account_id = (select v from _t where k='a1')::uuid) = 430000,
    'saldo A1 mudou com parcelas pendentes';
end $$;

-- ─── 5. Cartão + fatura (D5) ─────────────────────────────────────────────────
-- períodos da fatura (função pura)
do $$
declare r record;
begin
  select * into r from public.compute_invoice_period(3, 10, date '2026-07-10');
  assert r.reference_month = '2026-08-01' and r.closing_date = '2026-08-03' and r.due_date = '2026-08-10',
    'período (fecha 3, vence 10, compra 10/07) incorreto';

  select * into r from public.compute_invoice_period(3, 10, date '2026-07-02');
  assert r.reference_month = '2026-07-01' and r.closing_date = '2026-07-03' and r.due_date = '2026-07-10',
    'período (compra antes do fechamento) incorreto';

  select * into r from public.compute_invoice_period(28, 5, date '2026-07-10');
  assert r.reference_month = '2026-07-01' and r.closing_date = '2026-07-28' and r.due_date = '2026-08-05',
    'período (vencimento <= fechamento → mês seguinte) incorreto';
end $$;

-- upsert idempotente + compra na fatura + limite disponível
do $$
declare card uuid; inv1 uuid; inv2 uuid;
begin
  insert into public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  values ('11111111-1111-1111-1111-111111111111', 'Nu Crédito', 500000, 3, 10)
  returning id into card;
  insert into _t values ('card', card::text);

  inv1 := public.get_or_create_invoice(card, date '2026-07-10');
  inv2 := public.get_or_create_invoice(card, date '2026-07-10');
  assert inv1 = inv2, 'get_or_create_invoice não é idempotente';
  assert (select count(*) from public.credit_card_invoices where credit_card_id = card) = 1,
    'fatura duplicada';
  assert (select reference_month from public.credit_card_invoices where id = inv1) = '2026-08-01',
    'reference_month da fatura incorreto';

  insert into public.transactions (user_id, credit_card_id, invoice_id, category_id, type, status, description, amount_cents, date)
  values ('11111111-1111-1111-1111-111111111111', card, inv1,
          (select v from _t where k='cat_compras')::uuid,
          'expense', 'pending', 'Compra no cartão', 25000, '2026-07-10');

  assert (select total_cents from public.v_invoice_totals where invoice_id = inv1) = 25000,
    'total da fatura incorreto';
  assert public.get_card_available_limit(card) = 475000,
    'limite disponível incorreto (esperado 475000)';
end $$;

-- ─── 6. Recorrências (D6): âncora sem drift + catch-up + idempotência ───────
-- Template mensal ancorado em 31/01/2024 (passado garantido). A contagem
-- esperada é calculada dinamicamente contra current_date.
do $$
declare rec uuid;
begin
  insert into public.recurring_transactions
    (user_id, description, amount_cents, type, category_id, account_id,
     frequency, interval_count, start_date, next_run_date)
  values
    ('11111111-1111-1111-1111-111111111111', 'Salário recorrente', 250000, 'income',
     (select v from _t where k='cat_salario')::uuid,
     (select v from _t where k='a1')::uuid,
     'monthly', 1, '2024-01-31', '2024-01-31')
  returning id into rec;
  insert into _t values ('rec', rec::text);
end $$;

reset role; -- gerador tem EXECUTE revogado de clientes: roda como postgres (pg_cron)

do $$
declare
  rec uuid := (select v from _t where k='rec');
  expected int;
  got int;
  ret int;
begin
  select count(*) into expected
    from generate_series(0, 1200) k
   where public.advance_occurrence(date '2024-01-31', 'monthly', 1, k) <= current_date;

  ret := public.generate_recurring_transactions();
  select count(*) into got from public.transactions where recurring_id = rec;

  assert got = expected, format('gerador materializou %s ocorrências, esperado %s', got, expected);
  assert ret >= expected, 'retorno do gerador menor que o materializado';
  -- sem drift: fev clampa (29/02/2024, bissexto) mas março volta ao dia 31
  assert exists (select 1 from public.transactions where recurring_id = rec and date = '2024-02-29'),
    'drift: ocorrência de fevereiro/2024 deveria ser 29/02';
  assert exists (select 1 from public.transactions where recurring_id = rec and date = '2024-03-31'),
    'drift: ocorrência de março/2024 deveria voltar ao dia 31';
  assert (select count(distinct date_trunc('month', date)) from public.transactions where recurring_id = rec) = got,
    'mais de uma ocorrência no mesmo mês';
  assert (select next_run_date from public.recurring_transactions where id = rec) > current_date,
    'cursor next_run_date não avançou para o futuro';

  -- idempotência: segunda rodada não cria nada
  ret := public.generate_recurring_transactions();
  assert ret = 0, 'segunda rodada do gerador deveria retornar 0';
  select count(*) into got from public.transactions where recurring_id = rec;
  assert got = expected, 'segunda rodada do gerador duplicou ocorrências';
end $$;

-- ─── 7. Orçamento (competência, inclui pendentes) ────────────────────────────
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

do $$
begin
  insert into public.budgets (user_id, category_id, month, amount_cents, alert_threshold)
  values ('11111111-1111-1111-1111-111111111111',
          (select v from _t where k='cat_alimentacao')::uuid,
          '2026-07-01', 100000, 0.80);

  -- Alimentação em julho: 120000 (paga) + 30000 (pendente) = 150000 → 150%
  assert (select spent_cents from public.v_budget_usage
           where user_id = '11111111-1111-1111-1111-111111111111' and month = '2026-07-01') = 150000,
    'spent_cents do orçamento incorreto (esperado 150000)';
  assert (select alert_reached from public.v_budget_usage
           where user_id = '11111111-1111-1111-1111-111111111111' and month = '2026-07-01'),
    'alert_reached deveria ser true (150% > 80%)';
end $$;

-- ─── 8. Rate limit: só via função; tabela é inacessível ──────────────────────
do $$
begin
  assert public.check_rate_limit('smoke:test', 2, interval '1 hour') = true,  'hit 1 deveria passar';
  assert public.check_rate_limit('smoke:test', 2, interval '1 hour') = true,  'hit 2 deveria passar';
  assert public.check_rate_limit('smoke:test', 2, interval '1 hour') = false, 'hit 3 deveria ser bloqueado';
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.rate_limits;
  raise exception 'rate_limits deveria ser inacessível para authenticated';
exception
  when insufficient_privilege then null; -- 42501 esperado
end $$;

-- ─── 9. updated_at automático ────────────────────────────────────────────────
update public.accounts set name = 'Nubank PJ' where id = (select v from _t where k='a1')::uuid;

do $$
begin
  assert (select updated_at > created_at from public.accounts where id = (select v from _t where k='a1')::uuid),
    'trigger set_updated_at não atualizou updated_at';
end $$;

-- ─── 10. Storage: bucket + policies por dono do path ─────────────────────────
do $$
begin
  assert exists (select 1 from storage.buckets where id = 'attachments' and public = false),
    'bucket attachments ausente ou público';
  assert (select count(*) from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname like 'attachments_%') = 3,
    'esperadas 3 policies em storage.objects';
end $$;

-- upload no próprio prefixo passa; no prefixo alheio, 42501
insert into storage.objects (bucket_id, name, owner)
values ('attachments',
        '11111111-1111-1111-1111-111111111111/tx/recibo.pdf',
        '11111111-1111-1111-1111-111111111111');

do $$
begin
  insert into storage.objects (bucket_id, name, owner)
  values ('attachments',
          '22222222-2222-2222-2222-222222222222/tx/invasao.pdf',
          '11111111-1111-1111-1111-111111111111');
  raise exception 'STORAGE RLS FALHOU: upload em prefixo alheio foi aceito';
exception
  when insufficient_privilege then null; -- 42501 esperado
end $$;

reset role;
select 'SMOKE FASE 2: OK' as resultado;

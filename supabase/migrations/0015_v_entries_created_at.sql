-- =============================================================================
-- 0015 · v_entries expõe created_at (ordenar por "adicionadas por último")
-- -----------------------------------------------------------------------------
-- `date` na view é a COMPETÊNCIA/vencimento — então ordenar por data traz as
-- parcelas agendadas para o futuro ao topo, o que confunde "as mais recentes".
-- Para oferecer em /transacoes uma ordenação por ORDEM DE INSERÇÃO ("o que
-- entrou por último"), a view passa a expor `created_at`:
--   linha de transação → transactions.created_at;
--   linha de parcela   → created_at da compra-MÃE (transaction_installments
--                        não tem created_at próprio; a parcela nasce junto da
--                        mãe, então o created_at dela é o da mãe).
--
-- `create or replace view` só permite ACRESCENTAR colunas no fim — created_at
-- entra como última coluna, depois de affects_balance (definida na 0012).
-- Recria só a view (nenhuma tabela muda); regenera database.ts pela coluna
-- nova (hand-patch nesta sessão até o `db push`).
-- =============================================================================

create or replace view public.v_entries
with (security_invoker = on) as
select
  t.id,
  'transaction'::text        as entry_kind,
  t.id                       as transaction_id,
  null::int                  as installment_number,
  t.user_id,
  t.type,
  t.status,
  t.description,
  t.notes,
  t.amount_cents,
  t.date,
  t.category_id,
  t.account_id,
  t.credit_card_id,
  t.invoice_id,
  t.transfer_group_id,
  t.transfer_direction,
  t.recurring_id,
  t.affects_balance,
  t.created_at
from public.transactions t
where not t.is_installment_parent

union all

select
  i.id,
  'installment'::text        as entry_kind,
  p.id                       as transaction_id,
  i.installment_number,
  i.user_id,
  p.type,
  i.status,
  p.description,
  p.notes,
  i.amount_cents,
  i.due_date                 as date,
  p.category_id,
  p.account_id,
  p.credit_card_id,
  i.invoice_id,
  null::uuid                 as transfer_group_id,
  null::public.transfer_direction as transfer_direction,
  p.recurring_id,
  i.affects_balance,
  p.created_at
from public.transaction_installments i
join public.transactions p on p.id = i.transaction_id;

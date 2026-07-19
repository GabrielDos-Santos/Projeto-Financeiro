-- =============================================================================
-- 0013 · Nome da fatura por mês de vencimento, por cartão (opcional)
-- =============================================================================
-- Bancos brasileiros não seguem uma convenção única pra nomear a própria
-- fatura: quando o dia de vencimento é MENOR que o dia de fechamento (ex.:
-- Sicredi — fecha 25, vence 10), o vencimento cai no mês seguinte ao
-- fechamento, e alguns bancos (confirmado com o app do Sicredi) chamam a
-- fatura pelo mês de VENCIMENTO, não pelo mês de competência (quando as
-- compras entraram). Outros bancos (ex.: Nubank — fecha 10, vence 16, ambos
-- no mesmo mês) não têm essa ambiguidade. Como isso varia por banco/cartão
-- e não dá pra inferir com segurança, fica uma flag por cartão, desligada
-- por padrão (todo cartão já cadastrado continua nomeado por competência).

alter table public.credit_cards
  add column invoice_name_by_due_month boolean not null default false;

comment on column public.credit_cards.invoice_name_by_due_month is
  'true = o nome exibido da fatura (na timeline e na descrição do pagamento) usa o mês de VENCIMENTO em vez do mês de competência. Não afeta nenhum cálculo — só o rótulo visível.';

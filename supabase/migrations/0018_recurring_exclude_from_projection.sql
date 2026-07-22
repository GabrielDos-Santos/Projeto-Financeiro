-- Fase 20 (ajuste) — permitir marcar uma recorrência para NÃO entrar na
-- projeção de saldo (`/projecao`).
--
-- Caso de uso: regras cadastradas para organização/histórico que não são
-- compromisso futuro de caixa (ex.: uma assinatura que o usuário sabe que vai
-- cancelar, ou um valor variável que ele prefere estimar à mão). A recorrência
-- continua ativa e materializando lançamentos normalmente — o flag afeta
-- EXCLUSIVAMENTE a projeção.
--
-- Booleano NEGATIVO de propósito: `default false` faz toda regra existente
-- manter o comportamento atual (entra na projeção) sem backfill, e o checkbox
-- da UI ("Não incluir na projeção") liga direto na coluna, sem inversão no
-- meio do caminho — inversão em formulário é fonte clássica de bug.

alter table public.recurring_transactions
  add column if not exists exclude_from_projection boolean not null default false;

comment on column public.recurring_transactions.exclude_from_projection is
  'Quando true, a regra é ignorada pela projeção de saldo (/projecao): nem a expansão virtual das ocorrências futuras, nem os lançamentos pendentes já materializados por ela. Não afeta a geração de lançamentos, o saldo, os relatórios nem os orçamentos.';

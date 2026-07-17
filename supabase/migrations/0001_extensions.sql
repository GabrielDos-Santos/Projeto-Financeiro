-- =============================================================================
-- 0001 · Extensões
-- =============================================================================
-- gen_random_uuid() é nativo do Postgres 13+ — nenhuma extensão necessária.
--
-- pg_cron agenda a materialização das recorrências (agendamento no 0008).
-- O bloco é guardado para o `db push` nunca falhar caso a extensão não esteja
-- disponível: nesse caso, habilite em Dashboard → Database → Extensions e
-- rode o agendamento manualmente (snippet no 0008 / APLICAR.md).

do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron nao habilitado automaticamente (%). Habilite no painel e rode o agendamento do 0008.', sqlerrm;
end;
$$;

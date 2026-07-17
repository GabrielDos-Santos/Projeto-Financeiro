-- =============================================================================
-- 0011 · service_role pode executar generate_recurring_transactions()
-- -----------------------------------------------------------------------------
-- A 0006 fez `revoke execute ... from public, anon, authenticated`, mas nunca
-- concedeu de volta ao service_role — que só tinha o privilégio via PUBLIC.
-- Resultado: a Server Action "Gerar agora" (Fase 7), que chama a função com a
-- service role, falhava com "permission denied for function".
--
-- O pg_cron continua rodando como o dono do job (postgres), então o job diário
-- nunca dependeu disto. A função é SECURITY DEFINER (roda como o dono), então
-- conceder EXECUTE ao service_role só permite DISPARÁ-LA — sem privilégio novo.
--
-- Só um GRANT → sem mudança de schema, não precisa regerar database.ts.
-- =============================================================================

grant execute on function public.generate_recurring_transactions() to service_role;

-- =============================================================================
-- 0008 · Storage + backfill + agendamento
-- (No plano original era "seed_defaults"; o seed de categorias vive dentro de
--  create_default_categories/handle_new_user — aqui entram as 3 pontas finais.)
-- =============================================================================

-- ─── 1. Bucket privado de anexos ─────────────────────────────────────────────
-- Limite de tamanho e whitelist de mime também no Storage (defesa dupla com
-- os CHECKs de public.attachments).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── 2. Policies do Storage (path começa com o auth.uid) ─────────────────────
-- Path canônico: {user_id}/{transaction_id}/{uuid}.{ext}
-- Guardadas: se o projeto negar CREATE POLICY em storage.objects (varia com a
-- data de provisionamento), o push NÃO falha — crie as mesmas policies pelo
-- painel (Storage → Policies) com o SQL abaixo.
do $$
begin
  begin
    create policy "attachments_select_own" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  exception when duplicate_object then null;
  end;

  begin
    create policy "attachments_insert_own" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  exception when duplicate_object then null;
  end;

  begin
    create policy "attachments_delete_own" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  exception when duplicate_object then null;
  end;
exception
  when insufficient_privilege then
    raise notice 'Sem permissão para criar policies em storage.objects via migration — crie-as pelo painel (Storage → Policies) com o mesmo SQL deste arquivo.';
end;
$$;

-- ─── 3. Backfill de usuários já existentes ───────────────────────────────────
-- O trigger handle_new_user só dispara para NOVOS signups. Contas criadas na
-- Fase 1 (testes) ganham profile + settings + categorias padrão aqui — sem
-- isso, o app quebraria para elas a partir da Fase 3.
insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

insert into public.settings (user_id)
select u.id
from auth.users u
on conflict (user_id) do nothing;

select public.create_default_categories(u.id)
from auth.users u;

-- ─── 4. Agendamento do gerador de recorrências ───────────────────────────────
-- pg_cron roda em UTC: '0 6 * * *' = 03:00 America/Sao_Paulo (UTC−3, sem
-- horário de verão desde 2019). Guardado: sem pg_cron, o push não falha.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'generate-recurring-transactions') then
      perform cron.schedule(
        'generate-recurring-transactions',
        '0 6 * * *',
        $job$ select public.generate_recurring_transactions(); $job$
      );
    end if;
  else
    raise notice 'pg_cron ausente: habilite a extensão e rode → select cron.schedule(''generate-recurring-transactions'', ''0 6 * * *'', ''select public.generate_recurring_transactions();'');';
  end if;
end;
$$;

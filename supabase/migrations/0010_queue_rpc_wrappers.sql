-- SellerHub 0010: RPC-обёртки очереди в схеме public
--
-- Проблема: Edge Function ходит в базу через PostgREST (supabase-js .rpc()).
-- PostgREST видит только схемы из api.schemas — там только public.
-- Функции очереди лежат в app — намеренно, чтобы браузер их не видел.
--
-- Решение: тонкие обёртки в public, доступные ТОЛЬКО service_role.
-- Анонимы и authenticated их вызвать не могут — grant только service_role.

-- Захват порции задач
create or replace function public.claim_jobs(p_limit int default 10, p_worker text default 'dispatcher')
returns setof public.sync_jobs
language sql security definer set search_path = '' as $$
  select * from app.claim_jobs(p_limit, p_worker);
$$;

-- Завершение задачи
create or replace function public.finish_job(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql security definer set search_path = '' as $$
  select app.finish_job(p_id, p_ok, p_error);
$$;

-- Постановка задачи
create or replace function public.enqueue_job(
  p_tenant uuid,
  p_marketplace public.marketplace,
  p_job_type text,
  p_payload jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_priority smallint default 100
) returns bigint
language sql security definer set search_path = '' as $$
  select app.enqueue_job(p_tenant, p_marketplace, p_job_type, p_payload, p_dedupe_key, p_priority);
$$;

-- Доступ только service_role. Браузер эти функции вызвать не может.
revoke all on function public.claim_jobs(int, text)                                              from public, anon, authenticated;
revoke all on function public.finish_job(bigint, boolean, text)                                  from public, anon, authenticated;
revoke all on function public.enqueue_job(uuid, public.marketplace, text, jsonb, text, smallint) from public, anon, authenticated;

grant execute on function public.claim_jobs(int, text)                                              to service_role;
grant execute on function public.finish_job(bigint, boolean, text)                                  to service_role;
grant execute on function public.enqueue_job(uuid, public.marketplace, text, jsonb, text, smallint) to service_role;

comment on function public.claim_jobs(int, text)  is 'Обёртка app.claim_jobs для PostgREST. Только service_role.';
comment on function public.finish_job(bigint, boolean, text) is 'Обёртка app.finish_job для PostgREST. Только service_role.';
comment on function public.enqueue_job(uuid, public.marketplace, text, jsonb, text, smallint) is 'Обёртка app.enqueue_job для PostgREST. Только service_role.';

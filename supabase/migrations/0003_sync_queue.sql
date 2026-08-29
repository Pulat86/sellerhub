-- SellerHub 0003: очередь фоновых задач синхронизации
create type public.marketplace as enum ('uzum','wildberries','ozon','yandex_market');
create type public.job_status  as enum ('pending','running','succeeded','failed','dead');

create table public.sync_jobs (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  marketplace  public.marketplace not null,
  job_type     text not null check (job_type in (
                 'products.pull','products.push','stock.pull','stock.push',
                 'price.push','orders.pull','order.status.push')),
  payload      jsonb not null default '{}'::jsonb,
  dedupe_key   text,
  status       public.job_status not null default 'pending',
  priority     smallint not null default 100,
  attempts     int not null default 0,
  max_attempts int not null default 5,
  next_run_at  timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.sync_jobs is 'Очередь порционной синхронизации с маркетплейсами.';
comment on column public.sync_jobs.dedupe_key is 'Пока задача pending или running, вторая такая же не создаётся.';

create unique index sync_jobs_dedupe_idx on public.sync_jobs (tenant_id, marketplace, job_type, dedupe_key)
  where dedupe_key is not null and status in ('pending','running');

create index sync_jobs_claim_idx on public.sync_jobs (next_run_at, priority)
  where status = 'pending';
create index sync_jobs_tenant_idx on public.sync_jobs (tenant_id, created_at desc);

create trigger sync_jobs_touch before update on public.sync_jobs
  for each row execute function app.touch_updated_at();

alter table public.sync_jobs enable row level security;

-- Продавец видит журнал своих задач. Писать может только service_role.
create policy sync_jobs_select on public.sync_jobs
  for select to authenticated using (app.is_member(tenant_id));

-- Взять порцию задач. SKIP LOCKED: два воркера не возьмут одну задачу.
create or replace function app.claim_jobs(p_limit int default 10, p_worker text default 'dispatcher')
returns setof public.sync_jobs language sql security definer set search_path = '' as $$
  update public.sync_jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id in (
     select id from public.sync_jobs
      where status = 'pending' and next_run_at <= now()
      order by priority, next_run_at
      limit p_limit
      for update skip locked
   )
  returning j.*;
$$;

-- Завершение задачи: экспоненциальный backoff, после max_attempts — dead.
create or replace function app.finish_job(p_id bigint, p_ok boolean, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.sync_jobs;
begin
  select * into v_job from public.sync_jobs where id = p_id;
  if not found then
    raise exception 'job % not found', p_id;
  end if;

  if p_ok then
    update public.sync_jobs
       set status = 'succeeded', locked_at = null, locked_by = null, last_error = null
     where id = p_id;
  elsif v_job.attempts >= v_job.max_attempts then
    update public.sync_jobs
       set status = 'dead', locked_at = null, locked_by = null, last_error = p_error
     where id = p_id;
  else
    update public.sync_jobs
       set status      = 'pending',
           locked_at   = null,
           locked_by   = null,
           last_error  = p_error,
           next_run_at = now() + (interval '30 seconds' * power(2, v_job.attempts))
     where id = p_id;
  end if;
end;
$$;

-- Постановка задачи. Идемпотентна по dedupe_key.
create or replace function app.enqueue_job(
  p_tenant uuid, p_marketplace public.marketplace, p_job_type text,
  p_payload jsonb default '{}'::jsonb, p_dedupe_key text default null, p_priority smallint default 100
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.sync_jobs (tenant_id, marketplace, job_type, payload, dedupe_key, priority)
  values (p_tenant, p_marketplace, p_job_type, p_payload, p_dedupe_key, p_priority)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.sync_jobs
     where tenant_id = p_tenant and marketplace = p_marketplace and job_type = p_job_type
       and dedupe_key = p_dedupe_key and status in ('pending','running')
     limit 1;
  end if;

  return v_id;
end;
$$;

-- Освобождение зависших задач: воркер умер, задача осталась в running.
create or replace function app.reap_stuck_jobs(p_older_than interval default interval '10 minutes')
returns int language sql security definer set search_path = '' as $$
  with reaped as (
    update public.sync_jobs
       set status = 'pending', locked_at = null, locked_by = null,
           last_error = 'reaped: worker timeout', next_run_at = now()
     where status = 'running' and locked_at < now() - p_older_than
    returning 1
  ) select count(*)::int from reaped;
$$;

revoke all on function app.claim_jobs(int, text)                                              from public;
revoke all on function app.finish_job(bigint, boolean, text)                                  from public;
revoke all on function app.enqueue_job(uuid, public.marketplace, text, jsonb, text, smallint) from public;
revoke all on function app.reap_stuck_jobs(interval)                                          from public;

-- SellerHub 0006: диспетчер очереди — pg_cron + pg_net
--
-- Зависимости: расширения pg_cron и pg_net должны быть включены
-- в Supabase Dashboard → Database → Extensions.
-- В локальном стеке CLI они включаются через config.toml (см. ниже).
-- Миграция безопасна для повторного применения: все объекты создаются
-- через IF NOT EXISTS или OR REPLACE.

-- 1. Расширения
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- 2. Таблица конфига
create table if not exists app.config (
  key   text primary key,
  value text not null
);
comment on table app.config is
  'Конфигурационные пары key=value для Edge Functions и pg_cron.';

-- app.config не публикуется через PostgREST (схема app не в api.schemas).
-- Не нужна RLS — доступ только из security definer функций.

-- 3. Функция-диспетчер.
--    Вызывается pg_cron каждую минуту.
--    Берёт pending-задачи → шлёт HTTP-запрос в Edge Function → Edge Function
--    сама забирает задачи через app.claim_jobs и обрабатывает.
--
--    pg_net регистрирует расширение в схеме extensions, но функции
--    публикует в схеме net. Правильный вызов: net.http_post(), не extensions.http_post().
create or replace function app.dispatch_pending_jobs()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url     text;
  v_pending int;
begin
  -- Пропускаем вызов, если нет pending-задач (экономим HTTP-квоту pg_net).
  select count(*) into v_pending
    from public.sync_jobs
   where status = 'pending' and next_run_at <= now();

  if v_pending = 0 then
    return;
  end if;

  -- Читаем URL диспетчера из конфига.
  select value into v_url from app.config where key = 'DISPATCH_URL';

  if v_url is null then
    raise warning 'dispatch_pending_jobs: DISPATCH_URL не задан в app.config — пропуск';
    return;
  end if;

  -- Асинхронный HTTP-вызов через pg_net.
  -- net.http_post возвращает bigint (request id) — игнорируем.
  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron', 'pending', v_pending),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

exception when others then
  -- Не даём pg_cron падать из-за сетевой ошибки.
  raise warning 'dispatch_pending_jobs error: %', sqlerrm;
end;
$$;

-- 4. pg_cron расписание.
--    Удаляем старые версии заданий перед установкой (идемпотентность).
select cron.unschedule(jobname)
  from cron.job
 where jobname in ('sellerhub_dispatch', 'sellerhub_reap')
   and jobname is not null;

-- Диспетчер: каждую минуту.
select cron.schedule(
  'sellerhub_dispatch',
  '* * * * *',
  $$select app.dispatch_pending_jobs()$$
);

-- Reaper: каждые 5 минут — освобождает зависшие задачи.
select cron.schedule(
  'sellerhub_reap',
  '*/5 * * * *',
  $$select app.reap_stuck_jobs(interval '10 minutes')$$
);

revoke all on function app.dispatch_pending_jobs() from public;

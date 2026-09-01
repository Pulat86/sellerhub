-- SellerHub 0008: добавляем heartbeat.ping в check constraint job_type
--
-- 0003 задавал жёсткий список job_type. Вместо редактировать 0003
-- (потеряем повторяемость) — добавляем constraint отдельной миграцией.

alter table public.sync_jobs
  drop constraint if exists sync_jobs_job_type_check;

alter table public.sync_jobs
  add constraint sync_jobs_job_type_check
  check (job_type in (
    'products.pull',  'products.push',
    'stock.pull',     'stock.push',
    'price.push',
    'orders.pull',    'order.status.push',
    'heartbeat.ping'   -- тестовый / диагностический
  ));

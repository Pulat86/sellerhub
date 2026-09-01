-- SellerHub 0009: RLS-политики для service_role на sync_jobs
--
-- Проблема: claim_jobs делает UPDATE на sync_jobs, но политики UPDATE не было.
-- Edge Function работает с service_role — ей нужен полный доступ к sync_jobs.
-- Диспетчер (pg_cron) работает от postgres — ему нужен SELECT для подсчёта.
--
-- Решение: service_role обходит RLS по умолчанию в Supabase (bypass rls),
-- но security definer функции выполняются от своего владельца.
-- Добавляем явные политики для надёжности.

-- SELECT: postgres (диспетчер) и service_role видят все задачи
create policy sync_jobs_postgres_select on public.sync_jobs
  for select to postgres using (true);

-- UPDATE: service_role может менять статус задач (claim_jobs, finish_job)
create policy sync_jobs_service_all on public.sync_jobs
  for all to service_role using (true) with check (true);

-- INSERT: service_role может создавать задачи (enqueue_job)
-- уже покрыто политикой all выше

-- Убираем дублирующую политику которую добавили вручную ранее
drop policy if exists sync_jobs_service_select on public.sync_jobs;

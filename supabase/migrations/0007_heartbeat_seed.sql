-- SellerHub 0007: тестовая задача heartbeat.ping
--
-- Цель: сквозной прогон цепочки
--   pg_cron → dispatch_pending_jobs → pg_net → Edge Function dispatch-jobs → finish_job
--
-- Задача ставится вручную один раз и больше не создаётся благодаря dedupe_key.
-- После успешного прогона статус перейдёт в succeeded.
-- Используй enqueue_job вместо прямого INSERT, чтобы идемпотентность работала.

do $$
declare
  v_tenant uuid;
begin
  -- Берём первый существующий тенант (если нет — просто не ставим, сид безопасен).
  select id into v_tenant from public.tenants limit 1;
  if v_tenant is null then
    raise notice '0007: tenants пусты, heartbeat не создаётся';
    return;
  end if;

  perform app.enqueue_job(
    p_tenant      := v_tenant,
    p_marketplace := 'uzum',
    p_job_type    := 'heartbeat.ping',
    p_dedupe_key  := 'sprint0-smoke',
    p_priority    := 1
  );

  raise notice '0007: heartbeat.ping засеян, tenant=%', v_tenant;
end;
$$;

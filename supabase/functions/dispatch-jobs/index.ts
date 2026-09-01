/**
 * SellerHub — Edge Function: dispatch-jobs
 *
 * Вызывается диспетчером (pg_cron → pg_net → этот endpoint).
 * Также может быть вызвана вручную для отладки.
 *
 * Что делает:
 * 1. Забирает порцию pending-задач из очереди (app.claim_jobs).
 * 2. Для каждой задачи вызывает обработчик по типу задачи.
 * 3. Отмечает результат через app.finish_job.
 *
 * Реальные обработчики маркетплейсов появятся в Sprint 1.
 * Сейчас регистрируется тип-заглушка 'heartbeat.ping' для сквозного теста.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Сколько задач берём за один вызов функции. */
const BATCH_SIZE = 10;

/** Тип обработчика одной задачи. */
type JobRow = {
  id: number;
  tenant_id: string;
  marketplace: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type HandlerResult = { ok: boolean; error?: string };
type Handler = (job: JobRow, db: ReturnType<typeof createClient>) => Promise<HandlerResult>;

/** Реестр обработчиков. Sprint 1 добавит uzum.products.pull и т.д. */
const handlers: Record<string, Handler> = {
  'heartbeat.ping': async (_job, _db) => {
    // Тестовый обработчик: просто успешно завершается.
    console.log('[heartbeat.ping] ok');
    return { ok: true };
  },
};

Deno.serve(async (req) => {
  // Принимаем POST и GET (GET удобен для ручного теста из браузера).
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. Забрать задачи.
  const { data: jobs, error: claimErr } = await db
    .rpc('claim_jobs', { p_limit: BATCH_SIZE, p_worker: 'edge-dispatch' });

  if (claimErr) {
    console.error('[dispatch] claim_jobs error:', claimErr.message);
    return Response.json({ error: claimErr.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return Response.json({ processed: 0, message: 'no pending jobs' });
  }

  // 2. Обработать каждую задачу.
  const results: Array<{ id: number; ok: boolean; error?: string }> = [];

  await Promise.allSettled(
    (jobs as JobRow[]).map(async (job) => {
      const handler = handlers[job.job_type];
      let result: HandlerResult;

      if (!handler) {
        result = { ok: false, error: `no handler for job_type: ${job.job_type}` };
        console.warn(`[dispatch] ${job.job_type} — обработчик не найден, job_id=${job.id}`);
      } else {
        try {
          result = await handler(job, db);
        } catch (e) {
          result = { ok: false, error: e instanceof Error ? e.message : String(e) };
          console.error(`[dispatch] job_id=${job.id} threw:`, result.error);
        }
      }

      // 3. Зафиксировать результат.
      const { error: finishErr } = await db.rpc('finish_job', {
        p_id: job.id,
        p_ok: result.ok,
        p_error: result.error ?? null,
      });

      if (finishErr) {
        console.error(`[dispatch] finish_job error for job_id=${job.id}:`, finishErr.message);
      }

      results.push({ id: job.id, ...result });
    })
  );

  const succeeded = results.filter((r) => r.ok).length;
  const failed    = results.filter((r) => !r.ok).length;

  console.log(`[dispatch] processed=${results.length} ok=${succeeded} fail=${failed}`);

  return Response.json({ processed: results.length, succeeded, failed, results });
});

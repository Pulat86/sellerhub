-- SellerHub 0016: отчёт по остаткам и журнал движений
--
-- Почему функции, а не запросы с фронта.
-- Остаток лежит в представлении, а название товара и артикул — в двух других
-- таблицах. PostgREST не умеет надёжно связывать представление с таблицами:
-- у представления нет внешних ключей, по которым он строит связи.
--
-- security invoker — RLS применяется к вызывающему, как и в search_products.

create type public.stock_report_row as (
  variant_id     uuid,
  sku            text,
  barcode        text,
  product_id     uuid,
  product_name   text,
  warehouse_id   uuid,
  warehouse_name text,
  qty            numeric,
  total_count    bigint
);

create type public.stock_journal_row as (
  id             bigint,
  created_at     timestamptz,
  warehouse_id   uuid,
  warehouse_name text,
  variant_id     uuid,
  sku            text,
  product_name   text,
  qty            numeric,
  reason         public.stock_reason,
  doc_ref        text,
  note           text,
  actor_name     text,
  total_count    bigint
);


-- Остатки. Строки с нулёвым остатком показываются: «было и кончилось»
-- — это важная для продавца информация, а не пустота.
create or replace function public.stock_report(
  p_tenant    uuid,
  p_warehouse uuid default null,
  p_search    text default null,
  p_limit     int  default 50,
  p_offset    int  default 0
)
returns setof public.stock_report_row
language sql stable security invoker set search_path = '' as $$
  with needle as (
    select nullif(btrim(coalesce(p_search, '')), '') as q
  ),
  rows as (
    select
      b.variant_id,
      v.sku,
      v.barcode,
      p.id   as product_id,
      p.name as product_name,
      b.warehouse_id,
      w.name as warehouse_name,
      b.qty
    from public.stock_balances b
    join public.product_variants v on v.id = b.variant_id  and v.tenant_id = b.tenant_id
    join public.products         p on p.id = v.product_id  and p.tenant_id = v.tenant_id
    join public.warehouses       w on w.id = b.warehouse_id and w.tenant_id = b.tenant_id
    cross join needle n
    where b.tenant_id = p_tenant
      and (p_warehouse is null or b.warehouse_id = p_warehouse)
      and (
        n.q is null
        or p.name  ilike '%' || n.q || '%'
        or v.sku   ilike '%' || n.q || '%'
        or v.barcode ilike '%' || n.q || '%'
      )
  )
  select
    r.variant_id, r.sku, r.barcode, r.product_id, r.product_name,
    r.warehouse_id, r.warehouse_name, r.qty,
    count(*) over ()
  from rows r
  order by r.product_name, r.sku
  limit  greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.stock_report(uuid, uuid, text, int, int) from public, anon;
grant execute on function public.stock_report(uuid, uuid, text, int, int) to authenticated;


-- Журнал движений. Отвечает на вопрос «почему остаток именно такой».
create or replace function public.stock_journal(
  p_tenant    uuid,
  p_warehouse uuid default null,
  p_variant   uuid default null,
  p_limit     int  default 50,
  p_offset    int  default 0
)
returns setof public.stock_journal_row
language sql stable security invoker set search_path = '' as $$
  select
    m.id,
    m.created_at,
    m.warehouse_id,
    w.name,
    m.variant_id,
    v.sku,
    p.name,
    m.qty,
    m.reason,
    m.doc_ref,
    m.note,
    pr.full_name,
    count(*) over ()
  from public.stock_movements m
  join public.warehouses       w on w.id = m.warehouse_id and w.tenant_id = m.tenant_id
  join public.product_variants v on v.id = m.variant_id   and v.tenant_id = m.tenant_id
  join public.products         p on p.id = v.product_id   and p.tenant_id = v.tenant_id
  left join public.profiles   pr on pr.id = m.actor_id
  where m.tenant_id = p_tenant
    and (p_warehouse is null or m.warehouse_id = p_warehouse)
    and (p_variant   is null or m.variant_id   = p_variant)
  order by m.created_at desc, m.id desc
  limit  greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.stock_journal(uuid, uuid, uuid, int, int) from public, anon;
grant execute on function public.stock_journal(uuid, uuid, uuid, int, int) to authenticated;

comment on function public.stock_report(uuid, uuid, text, int, int) is
  'Остатки с названием товара и артикулом. security invoker — RLS работает.';
comment on function public.stock_journal(uuid, uuid, uuid, int, int) is
  'Журнал движений с расшифровкой товара, склада и автора операции.';

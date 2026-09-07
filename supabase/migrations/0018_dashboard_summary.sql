-- SellerHub 0018: сводка для дашборда
--
-- Дашборд — первый экран, и он не может быть пустым. Но показывать выручку
-- и заказы пока нечем: адаптеры маркетплейсов не подключены, заказов нет.
--
-- Поэтому сводка честная: считаем то, что реально есть — каталог, склады,
-- остатки, себестоимость запасов и движения за неделю. Когда появятся
-- заказы, сюда добавятся выручка и продажи, а структура экрана не изменится.
--
-- Одна функция вместо шести запросов с фронта: дашборд открывается первым,
-- и шесть последовательных обращений к базе — это шесть задержек сети.

create type public.dashboard_summary_row as (
  products_total      bigint,
  products_no_stock   bigint,
  variants_total      bigint,
  warehouses_total    bigint,
  stock_units         numeric,
  stock_cost          numeric,
  negative_positions  bigint,
  movements_7d        bigint,
  received_7d         numeric,
  shipped_7d          numeric
);

create or replace function public.dashboard_summary(p_tenant uuid)
returns public.dashboard_summary_row
language sql stable security invoker set search_path = '' as $$
  select
    -- Каталог
    (select count(*) from public.products p
      where p.tenant_id = p_tenant and p.archived_at is null),

    -- Товары без остатка: видно, что закончилось и что ещё не принимали
    (select count(*) from public.products p
      where p.tenant_id = p_tenant and p.archived_at is null
        and not exists (
          select 1 from public.stock_balances b
           join public.product_variants v
             on v.id = b.variant_id and v.tenant_id = b.tenant_id
          where b.tenant_id = p_tenant and v.product_id = p.id and b.qty > 0
        )),

    (select count(*) from public.product_variants v
      where v.tenant_id = p_tenant and v.archived_at is null),

    (select count(*) from public.warehouses w
      where w.tenant_id = p_tenant and w.archived_at is null),

    -- Штук на складах
    coalesce((select sum(b.qty) from public.stock_balances b
               where b.tenant_id = p_tenant), 0),

    -- Себестоимость запасов: остаток × себестоимость варианта.
    -- Считает база, а не фронт: деньги во фронте не считаются.
    coalesce((select sum(b.qty * coalesce(v.cost_price, 0))
                from public.stock_balances b
                join public.product_variants v
                  on v.id = b.variant_id and v.tenant_id = b.tenant_id
               where b.tenant_id = p_tenant and b.qty > 0), 0),

    -- Позиции в минусе: продажа опередила приёмку либо ошибка учёта
    (select count(*) from public.stock_balances b
      where b.tenant_id = p_tenant and b.qty < 0),

    (select count(*) from public.stock_movements m
      where m.tenant_id = p_tenant and m.created_at >= now() - interval '7 days'),

    coalesce((select sum(m.qty) from public.stock_movements m
               where m.tenant_id = p_tenant
                 and m.created_at >= now() - interval '7 days'
                 and m.qty > 0), 0),

    coalesce((select -sum(m.qty) from public.stock_movements m
               where m.tenant_id = p_tenant
                 and m.created_at >= now() - interval '7 days'
                 and m.qty < 0), 0);
$$;

revoke all on function public.dashboard_summary(uuid) from public, anon;
grant execute on function public.dashboard_summary(uuid) to authenticated;

comment on function public.dashboard_summary(uuid) is
  'Сводка для дашборда одним запросом. security invoker — RLS применяется к вызывающему.';

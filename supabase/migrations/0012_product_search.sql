-- SellerHub 0012: поиск по каталогу
--
-- Зачем функция, а не запрос с фронта.
-- Продавец ищет товар по названию, по артикулу и по штрихкоду одним полем.
-- Название лежит в products, артикул и штрихкод — в product_variants.
-- Условие «одно ИЛИ другое через связь» PostgREST одним запросом не выражает.
--
-- Эта же функция потом послужит сканеру штрихкодов на складе.
--
-- security invoker — сознательно, а не definer.
-- Функция исполняется от имени вызывающего, значит RLS применяется к нему.
-- Защищает тот же механизм, что и весь остальной каталог, а не проверка внутри функции.

-- Составной тип для строки результата.
-- Взят вместо returns table намеренно: имена выходных колонок там
-- попадают в область видимости и конфликтуют с колонками таблиц (id, name).
create type public.product_search_row as (
  id            uuid,
  name          text,
  category_id   uuid,
  brand_id      uuid,
  category_name text,
  brand_name    text,
  sku           text,
  barcode       text,
  cost_price    numeric,
  cost_currency public.currency,
  variant_count bigint,
  created_at    timestamptz,
  total_count   bigint
);

create or replace function public.search_products(
  p_tenant   uuid,
  p_search   text default null,
  p_category uuid default null,
  p_brand    uuid default null,
  p_limit    int  default 25,
  p_offset   int  default 0
)
returns setof public.product_search_row
language sql stable security invoker set search_path = '' as $$
  with needle as (
    select nullif(btrim(coalesce(p_search, '')), '') as q
  ),
  matched as (
    select p.id, p.tenant_id, p.name, p.category_id, p.brand_id, p.created_at
      from public.products p, needle n
     where p.tenant_id = p_tenant
       and p.archived_at is null
       and (p_category is null or p.category_id = p_category)
       and (p_brand    is null or p.brand_id    = p_brand)
       and (
         n.q is null
         or p.name ilike '%' || n.q || '%'
         or exists (
              select 1
                from public.product_variants v
               where v.product_id = p.id
                 and v.tenant_id  = p.tenant_id
                 and v.archived_at is null
                 and (v.sku ilike '%' || n.q || '%' or v.barcode ilike '%' || n.q || '%')
            )
       )
  )
  select
    m.id,
    m.name,
    m.category_id,
    m.brand_id,
    c.name,
    b.name,
    fv.sku,
    fv.barcode,
    fv.cost_price,
    fv.cost_currency,
    (select count(*)
       from public.product_variants v2
      where v2.product_id = m.id
        and v2.tenant_id  = m.tenant_id
        and v2.archived_at is null),
    m.created_at,
    -- Оконная функция считается до limit, поэтому возвращает общее число
    -- совпавших товаров, а не размер страницы. Второй запрос на count не нужен.
    count(*) over ()
  from matched m
  left join public.categories c on c.id = m.category_id and c.tenant_id = m.tenant_id
  left join public.brands     b on b.id = m.brand_id    and b.tenant_id = m.tenant_id
  left join lateral (
    select v.sku, v.barcode, v.cost_price, v.cost_currency
      from public.product_variants v
     where v.product_id = m.id
       and v.tenant_id  = m.tenant_id
       and v.archived_at is null
     order by v.created_at
     limit 1
  ) fv on true
  order by m.created_at desc
  -- Потолок страницы: клиент не должен мочь вытащить весь каталог одним запросом.
  limit  greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_products(uuid, text, uuid, uuid, int, int) from public, anon;
grant execute on function public.search_products(uuid, text, uuid, uuid, int, int) to authenticated;

comment on function public.search_products(uuid, text, uuid, uuid, int, int) is
  'Поиск товаров по названию, артикулу и штрихкоду. security invoker — RLS применяется к вызывающему.';

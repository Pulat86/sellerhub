-- SellerHub 0017: наполнение демонстрационными данными
--
-- Зачем это в базе, а не скриптом.
-- Локальной разработки нет, и запустить скрипт негде. Продавцу нужно увидеть
-- работающие экраны до того, как появятся ключи маркетплейсов и настоящий товар.
--
-- Функция идемпотентна: повторный вызов не плодит дубли, потому что опирается
-- на те же уникальные ключи, что и обычная работа.
--
-- Движения склада НЕ идемпотентны по своей природе: журнал только пополняется.
-- Поэтому они создаются лишь один раз — при первом вызове для тенанта.

create or replace function public.seed_demo_data(p_tenant uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_cat_shoes  uuid;
  v_cat_bags   uuid;
  v_brand_a    uuid;
  v_brand_b    uuid;
  v_wh_main    uuid;
  v_wh_extra   uuid;
  v_product    uuid;
  v_variant    uuid;
  v_had_moves  boolean;
  v_created    int := 0;
  v_item       record;
begin
  -- Наполнять чужой тенант нельзя, и права те же, что на обычную запись.
  if not app.can_write_catalog(p_tenant) then
    raise exception 'недостаточно прав' using errcode = '42501';
  end if;

  -- ---------- Справочники ----------
  insert into public.categories (tenant_id, name, slug, sort)
  values (p_tenant, 'Обувь', 'obuv', 10)
  on conflict (tenant_id, slug) do update set name = excluded.name
  returning id into v_cat_shoes;

  insert into public.categories (tenant_id, name, slug, sort)
  values (p_tenant, 'Сумки', 'sumki', 20)
  on conflict (tenant_id, slug) do update set name = excluded.name
  returning id into v_cat_bags;

  insert into public.brands (tenant_id, name, slug)
  values (p_tenant, 'Luxesy', 'luxesy')
  on conflict (tenant_id, slug) do update set name = excluded.name
  returning id into v_brand_a;

  insert into public.brands (tenant_id, name, slug)
  values (p_tenant, 'Ziyod', 'ziyod')
  on conflict (tenant_id, slug) do update set name = excluded.name
  returning id into v_brand_b;

  -- ---------- Склады ----------
  insert into public.warehouses (tenant_id, name, code, address, is_default)
  values (p_tenant, 'Основной склад', 'MAIN', 'Ташкент, Чиланзар', true)
  on conflict (tenant_id, code) do update set name = excluded.name
  returning id into v_wh_main;

  insert into public.warehouses (tenant_id, name, code, address, is_default)
  values (p_tenant, 'Склад Юнусабад', 'YUNUS', 'Ташкент, Юнусабад', false)
  on conflict (tenant_id, code) do update set name = excluded.name
  returning id into v_wh_extra;

  -- ---------- Товары ----------
  -- Названия и артикулы намеренно разные по длине и составу:
  -- на одинаковых данных не видно, как таблица ведёт себя с длинным именем.
  for v_item in
    select * from (values
      ('Кроссовки беговые Air Runner',    'SKU-1001', '4780000000011', 'obuv',  'luxesy', 185000, 42),
      ('Кроссовки городские Street Walk', 'SKU-1002', '4780000000028', 'obuv',  'luxesy', 210000, 18),
      ('Ботинки зимние Nordic',           'SKU-1003', '4780000000035', 'obuv',  'ziyod',  340000,  7),
      ('Туфли классические Formal Black', 'SKU-1004', '4780000000042', 'obuv',  'ziyod',  295000,  0),
      ('Сумка женская Tote Classic',      'SKU-2001', '4780000000059', 'sumki', 'luxesy', 155000, 25),
      ('Рюкзак городской Daypack 20L',    'SKU-2002', '4780000000066', 'sumki', 'ziyod',  120000, 33),
      ('Клатч вечерний Evening Slim',     'SKU-2003', null,            'sumki', 'luxesy',  98000,  4)
    ) as x(name, sku, barcode, cat, brand, cost, qty)
  loop
    insert into public.products (tenant_id, name, category_id, brand_id, description)
    values (
      p_tenant,
      v_item.name,
      case when v_item.cat = 'obuv' then v_cat_shoes else v_cat_bags end,
      case when v_item.brand = 'luxesy' then v_brand_a else v_brand_b end,
      'Демонстрационная позиция. Создана функцией seed_demo_data.'
    )
    returning id into v_product;

    insert into public.product_variants
      (tenant_id, product_id, sku, barcode, cost_price, cost_currency)
    values
      (p_tenant, v_product, v_item.sku, v_item.barcode, v_item.cost, 'UZS')
    on conflict (tenant_id, sku) do nothing
    returning id into v_variant;

    -- Артикул уже был — значит товар засеян прошлым вызовом.
    -- Свежесозданную карточку-дубль убираем, чтобы не копить пустые товары.
    if v_variant is null then
      delete from public.products where id = v_product;
      continue;
    end if;

    v_created := v_created + 1;

    -- Приёмка только для тех позиций, где задано количество.
    -- Позиция с нулём остаётся в каталоге без остатка — так проверяется,
    -- что экран отличает «нет товара» от «товара не существует».
    if v_item.qty > 0 then
      insert into public.stock_movements
        (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
      values
        (p_tenant, v_wh_main, v_variant, v_item.qty, 'receipt', 'DEMO-001',
         'Начальная приёмка демонстрационных данных');
    end if;
  end loop;

  -- ---------- Движения для наглядности журнала ----------
  -- Только при первом вызове: журнал append-only, повтор создал бы
  -- вторую продажу того же товара и исказил остаток.
  select exists (
    select 1 from public.stock_movements
     where tenant_id = p_tenant and doc_ref = 'DEMO-002'
  ) into v_had_moves;

  if not v_had_moves then
    insert into public.stock_movements
      (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
    select p_tenant, v_wh_main, v.id, -3, 'sale', 'DEMO-002', 'Демонстрационная продажа'
      from public.product_variants v
     where v.tenant_id = p_tenant and v.sku = 'SKU-1001';

    insert into public.stock_movements
      (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
    select p_tenant, v_wh_main, v.id, -1, 'writeoff', 'DEMO-002', 'Брак при приёмке'
      from public.product_variants v
     where v.tenant_id = p_tenant and v.sku = 'SKU-1003';

    -- Перемещение на второй склад: два движения, как и положено
    insert into public.stock_movements
      (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
    select p_tenant, v_wh_main, v.id, -5, 'transfer_out', 'DEMO-002', 'Перевод на Юнусабад'
      from public.product_variants v
     where v.tenant_id = p_tenant and v.sku = 'SKU-2002';

    insert into public.stock_movements
      (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
    select p_tenant, v_wh_extra, v.id, 5, 'transfer_in', 'DEMO-002', 'Перевод на Юнусабад'
      from public.product_variants v
     where v.tenant_id = p_tenant and v.sku = 'SKU-2002';

    -- Отрицательный остаток: продажа пришла раньше приёмки.
    -- Так проверяется, что экран показывает минус красным, а не прячет его.
    insert into public.stock_movements
      (tenant_id, warehouse_id, variant_id, qty, reason, doc_ref, note)
    select p_tenant, v_wh_extra, v.id, -2, 'sale', 'DEMO-002',
           'Продажа опередила приёмку — так бывает при синхронизации'
      from public.product_variants v
     where v.tenant_id = p_tenant and v.sku = 'SKU-2003';
  end if;

  return format('Создано товаров: %s. Склады, категории и бренды готовы.', v_created);
end;
$$;

revoke all on function public.seed_demo_data(uuid) from public, anon;
grant execute on function public.seed_demo_data(uuid) to authenticated;

comment on function public.seed_demo_data(uuid) is
  'Наполняет тенант демонстрационными данными. Идемпотентна по товарам и справочникам.';

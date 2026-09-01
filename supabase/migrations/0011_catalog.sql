-- SellerHub 0011: каталог товаров
--
-- Первый модуль с реальными данными продавца. Всё, что появится дальше —
-- остатки, заказы, цены, связки с площадками — ссылается сюда.
--
-- Ключевое архитектурное решение этой миграции: составные внешние ключи
-- вида (id, tenant_id). Обычный FK по одному id позволил бы привязать
-- вариант товара тенанта A к товару тенанта B — RLS такую запись не поймает,
-- потому что каждая строка по отдельности выглядит законной.
-- Составной ключ делает межтенантную связку невозможной на уровне базы.

-- Поиск по названию товара: ILIKE '%текст%' без индекса — полный скан.
create extension if not exists pg_trgm with schema extensions;

-- Валюта хранится явно. Деньги никогда не считаются во фронте.
create type public.currency as enum ('UZS','USD','RUB','KZT','EUR');

-- Состояние связки нашего варианта с карточкой на площадке
create type public.listing_status as enum ('pending','active','inactive','error');


-- ============================================================
-- ХЕЛПЕРЫ ПРАВ
-- ============================================================
-- Права каталога по ролям:
--   owner, admin    — всё, включая удаление
--   manager         — создание и редактирование
--   warehouse       — только чтение
--   viewer          — только чтение
--
-- Вынесены в функции, чтобы массив ролей был записан один раз.
-- Меняется право — меняется одна строка, а не двадцать политик.

create or replace function app.can_write_catalog(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role(p_tenant, array['owner','admin','manager']::public.member_role[]);
$$;

create or replace function app.can_delete_catalog(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role(p_tenant, array['owner','admin']::public.member_role[]);
$$;

revoke all on function app.can_write_catalog(uuid)  from public;
revoke all on function app.can_delete_catalog(uuid) from public;
grant execute on function app.can_write_catalog(uuid)  to authenticated;
grant execute on function app.can_delete_catalog(uuid) to authenticated;


-- ============================================================
-- КАТЕГОРИИ
-- ============================================================
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  parent_id  uuid,
  name       text not null check (length(btrim(name)) between 1 and 200),
  slug       text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, slug)
);
comment on table public.categories is 'Дерево категорий товаров внутри тенанта.';
comment on column public.categories.sort is 'Порядок показа среди соседей по уровню.';

-- Родитель обязан принадлежать тому же тенанту.
alter table public.categories
  add constraint categories_parent_fk
  foreign key (parent_id, tenant_id) references public.categories (id, tenant_id) on delete set null;

create index categories_tenant_idx on public.categories (tenant_id, sort, name);
create index categories_parent_idx on public.categories (parent_id) where parent_id is not null;

create trigger categories_touch before update on public.categories
  for each row execute function app.touch_updated_at();

-- Защита от цикла: категория не может стать потомком самой себя.
-- Без этой проверки обход дерева уходит в бесконечность.
create or replace function app.check_category_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_parent uuid := new.parent_id;
  v_depth  int  := 0;
begin
  while v_parent is not null loop
    if v_parent = new.id then
      raise exception 'категория не может быть потомком самой себя' using errcode = '23514';
    end if;
    v_depth := v_depth + 1;
    if v_depth > 20 then
      raise exception 'слишком глубокое дерево категорий (более 20 уровней)' using errcode = '23514';
    end if;
    select parent_id into v_parent from public.categories where id = v_parent;
  end loop;
  return new;
end;
$$;

create trigger categories_no_cycle before insert or update of parent_id on public.categories
  for each row when (new.parent_id is not null) execute function app.check_category_cycle();


-- ============================================================
-- БРЕНДЫ
-- ============================================================
create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 200),
  slug       text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, slug)
);
comment on table public.brands is 'Справочник брендов внутри тенанта.';

create index brands_tenant_idx on public.brands (tenant_id, name);

create trigger brands_touch before update on public.brands
  for each row execute function app.touch_updated_at();


-- ============================================================
-- ТОВАРЫ
-- ============================================================
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  category_id  uuid,
  brand_id     uuid,
  name         text not null check (length(btrim(name)) between 1 and 500),
  description  text check (length(description) <= 20000),
  has_variants boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, tenant_id)
);
comment on table public.products is
  'Товар как карточка в каталоге. То, что реально продаётся и лежит на складе — product_variants.';
comment on column public.products.archived_at is
  'Мягкое удаление. Товар может фигурировать в старых заказах, физически не удаляем.';
comment on column public.products.has_variants is
  'false — у товара один технический вариант. true — размеры/цвета. Вариант есть всегда.';

alter table public.products
  add constraint products_category_fk
  foreign key (category_id, tenant_id) references public.categories (id, tenant_id) on delete set null;
alter table public.products
  add constraint products_brand_fk
  foreign key (brand_id, tenant_id) references public.brands (id, tenant_id) on delete set null;

-- Основной список каталога: активные товары тенанта, свежие сверху.
create index products_tenant_active_idx on public.products (tenant_id, created_at desc)
  where archived_at is null;
create index products_category_idx on public.products (category_id) where category_id is not null;
create index products_brand_idx    on public.products (brand_id)    where brand_id    is not null;

-- Поиск по названию. Триграммный индекс работает с ILIKE '%...%'.
create index products_name_trgm_idx on public.products
  using gin (name extensions.gin_trgm_ops);

create trigger products_touch before update on public.products
  for each row execute function app.touch_updated_at();


-- ============================================================
-- ВАРИАНТЫ ТОВАРА
-- ============================================================
create table public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  product_id    uuid not null,
  sku           text not null check (length(btrim(sku)) between 1 and 64),
  barcode       text check (length(btrim(barcode)) between 6 and 64),
  name          text check (length(btrim(name)) between 1 and 300),
  attributes    jsonb not null default '{}'::jsonb,
  cost_price    numeric(14,2) check (cost_price >= 0),
  cost_currency public.currency not null default 'UZS',
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, tenant_id),
  -- SKU уникален внутри тенанта, а не глобально:
  -- у разных продавцов артикулы совпадут, это норма.
  unique (tenant_id, sku)
);
comment on table public.product_variants is
  'Складская единица. Остатки, цены и связки с площадками привязываются сюда, не к товару.';
comment on column public.product_variants.attributes is
  'Свойства варианта: {"размер":"42","цвет":"чёрный"}. jsonb — набор свойств у категорий разный.';
comment on column public.product_variants.cost_price is
  'Себестоимость. numeric, не float: float теряет копейки на сложении.';

alter table public.product_variants
  add constraint product_variants_product_fk
  foreign key (product_id, tenant_id) references public.products (id, tenant_id) on delete cascade;

create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_tenant_idx  on public.product_variants (tenant_id, sku)
  where archived_at is null;

-- Штрихкод необязателен, но если есть — уникален внутри тенанта.
create unique index product_variants_barcode_idx on public.product_variants (tenant_id, barcode)
  where barcode is not null;

-- Фильтрация по свойствам варианта.
create index product_variants_attributes_idx on public.product_variants using gin (attributes);

create trigger product_variants_touch before update on public.product_variants
  for each row execute function app.touch_updated_at();


-- ============================================================
-- ИЗОБРАЖЕНИЯ
-- ============================================================
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  product_id   uuid not null,
  variant_id   uuid,
  storage_path text not null check (length(btrim(storage_path)) between 1 and 500),
  alt          text check (length(alt) <= 300),
  sort         int  not null default 0,
  created_at   timestamptz not null default now()
);
comment on table public.product_images is
  'Изображения товара. Файл лежит в Supabase Storage, здесь только путь и порядок.';
comment on column public.product_images.variant_id is
  'null — фото общее для товара. Заполнено — фото конкретного варианта (свой цвет).';

alter table public.product_images
  add constraint product_images_product_fk
  foreign key (product_id, tenant_id) references public.products (id, tenant_id) on delete cascade;
alter table public.product_images
  add constraint product_images_variant_fk
  foreign key (variant_id, tenant_id) references public.product_variants (id, tenant_id) on delete cascade;

create index product_images_product_idx on public.product_images (product_id, sort);
create index product_images_variant_idx on public.product_images (variant_id) where variant_id is not null;
create index product_images_tenant_idx  on public.product_images (tenant_id);


-- ============================================================
-- СВЯЗКА С ПЛОЩАДКАМИ
-- ============================================================
-- Заполняется адаптерами (Sprint 1, шаг 2). Схема закладывается сейчас,
-- чтобы адаптер не потребовал переделки каталога.
create table public.marketplace_listings (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  variant_id     uuid not null,
  marketplace    public.marketplace not null,
  external_id    text not null check (length(btrim(external_id)) between 1 and 128),
  external_sku   text check (length(btrim(external_sku)) between 1 and 128),
  url            text check (length(url) <= 1000),
  status         public.listing_status not null default 'pending',
  last_synced_at timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Идемпотентность импорта: повторная синхронизация обновляет строку,
  -- а не плодит дубли. Требование стандарта интеграции.
  unique (tenant_id, marketplace, external_id)
);
comment on table public.marketplace_listings is
  'Связка «наш вариант ↔ карточка на площадке». Заполняется адаптерами.';

alter table public.marketplace_listings
  add constraint marketplace_listings_variant_fk
  foreign key (variant_id, tenant_id) references public.product_variants (id, tenant_id) on delete cascade;

create index marketplace_listings_variant_idx on public.marketplace_listings (variant_id);
create index marketplace_listings_tenant_idx  on public.marketplace_listings (tenant_id, marketplace, status);

create trigger marketplace_listings_touch before update on public.marketplace_listings
  for each row execute function app.touch_updated_at();


-- ============================================================
-- RLS
-- ============================================================
-- На каждой таблице включён RLS и заведены политики на все четыре операции.
-- На одну роль и операцию — ровно одна разрешающая политика:
-- две политики SELECT выполнялись бы обе на каждый запрос.

alter table public.categories            enable row level security;
alter table public.brands                enable row level security;
alter table public.products              enable row level security;
alter table public.product_variants      enable row level security;
alter table public.product_images        enable row level security;
alter table public.marketplace_listings  enable row level security;

-- categories
create policy categories_select on public.categories
  for select to authenticated using (app.is_member(tenant_id));
create policy categories_insert on public.categories
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy categories_update on public.categories
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy categories_delete on public.categories
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- brands
create policy brands_select on public.brands
  for select to authenticated using (app.is_member(tenant_id));
create policy brands_insert on public.brands
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy brands_update on public.brands
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy brands_delete on public.brands
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- products
create policy products_select on public.products
  for select to authenticated using (app.is_member(tenant_id));
create policy products_insert on public.products
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy products_update on public.products
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy products_delete on public.products
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- product_variants
create policy product_variants_select on public.product_variants
  for select to authenticated using (app.is_member(tenant_id));
create policy product_variants_insert on public.product_variants
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy product_variants_update on public.product_variants
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy product_variants_delete on public.product_variants
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- product_images
create policy product_images_select on public.product_images
  for select to authenticated using (app.is_member(tenant_id));
create policy product_images_insert on public.product_images
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy product_images_update on public.product_images
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy product_images_delete on public.product_images
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- marketplace_listings
-- Пишут адаптеры под service_role; человеку доступно чтение и ручная правка связки.
create policy marketplace_listings_select on public.marketplace_listings
  for select to authenticated using (app.is_member(tenant_id));
create policy marketplace_listings_insert on public.marketplace_listings
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy marketplace_listings_update on public.marketplace_listings
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy marketplace_listings_delete on public.marketplace_listings
  for delete to authenticated using (app.can_delete_catalog(tenant_id));

-- service_role: полный доступ для адаптеров и фоновых задач.
create policy categories_service           on public.categories           for all to service_role using (true) with check (true);
create policy brands_service               on public.brands               for all to service_role using (true) with check (true);
create policy products_service             on public.products             for all to service_role using (true) with check (true);
create policy product_variants_service     on public.product_variants     for all to service_role using (true) with check (true);
create policy product_images_service       on public.product_images       for all to service_role using (true) with check (true);
create policy marketplace_listings_service on public.marketplace_listings for all to service_role using (true) with check (true);


-- ============================================================
-- СОЗДАНИЕ ТОВАРА ОДНОЙ ОПЕРАЦИЕЙ
-- ============================================================
-- Товар без варианта бессмыслен: SKU, себестоимость и остаток живут на варианте.
-- Два отдельных запроса с фронта дали бы товар-сироту при обрыве связи.
create or replace function public.create_product(
  p_tenant      uuid,
  p_name        text,
  p_sku         text,
  p_barcode     text default null,
  p_category_id uuid default null,
  p_brand_id    uuid default null,
  p_cost_price  numeric default null,
  p_currency    public.currency default 'UZS',
  p_description text default null
) returns public.products
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products;
begin
  if not app.can_write_catalog(p_tenant) then
    raise exception 'недостаточно прав для создания товара' using errcode = '42501';
  end if;

  insert into public.products (tenant_id, name, description, category_id, brand_id)
  values (p_tenant, p_name, p_description, p_category_id, p_brand_id)
  returning * into v_product;

  insert into public.product_variants (tenant_id, product_id, sku, barcode, cost_price, cost_currency)
  values (p_tenant, v_product.id, p_sku, nullif(btrim(p_barcode), ''), p_cost_price, p_currency);

  return v_product;
end;
$$;

revoke all on function public.create_product(uuid, text, text, text, uuid, uuid, numeric, public.currency, text)
  from public, anon;
grant execute on function public.create_product(uuid, text, text, text, uuid, uuid, numeric, public.currency, text)
  to authenticated;

comment on function public.create_product(uuid, text, text, text, uuid, uuid, numeric, public.currency, text) is
  'Атомарно создаёт товар и его первый вариант. Права проверяются внутри.';

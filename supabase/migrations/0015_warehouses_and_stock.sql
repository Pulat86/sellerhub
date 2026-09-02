-- SellerHub 0015: склады и журнал движений
--
-- Ключевое решение: остаток не хранится числом. Он вычисляется из журнала
-- движений, который только пополняется и никогда не правится.
--
-- Почему так. Хранимый остаток расходится с реальностью при первом же сбое
-- и не даёт ответа на вопрос «почему их столько». Журнал даёт: каждая штука
-- прослеживается до причины и документа.
--
-- Ошибка исправляется обратным движением, а не правкой строки.
-- Это требование учёта, а не осторожность: исправленная задним числом приёмка
-- ломает себестоимость и все отчёты за период.

create type public.stock_reason as enum (
  'receipt',      -- приёмка от поставщика
  'writeoff',     -- списание: брак, утрата
  'transfer_out', -- ушло со склада при перемещении
  'transfer_in',  -- пришло на склад при перемещении
  'sale',         -- продажа, ставит адаптер площадки
  'return',       -- возврат покупателя
  'inventory',    -- поправка по итогам инвентаризации
  'correction'    -- ручная поправка с обязательным пояснением
);


-- ============================================================
-- СКЛАДЫ
-- ============================================================
create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 200),
  code        text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{0,30}$'),
  address     text check (length(address) <= 500),
  is_default  boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, code)
);
comment on table public.warehouses is 'Склады компании. Склад маркетплейса тоже склад.';
comment on column public.warehouses.code is 'Короткий код для документов и сканера, например MAIN.';

-- Склад по умолчанию в компании только один.
create unique index warehouses_one_default_idx on public.warehouses (tenant_id)
  where is_default and archived_at is null;

create index warehouses_tenant_idx on public.warehouses (tenant_id, name)
  where archived_at is null;

create trigger warehouses_touch before update on public.warehouses
  for each row execute function app.touch_updated_at();


-- ============================================================
-- ЖУРНАЛ ДВИЖЕНИЙ
-- ============================================================
create table public.stock_movements (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  warehouse_id uuid not null,
  variant_id   uuid not null,
  -- Положительное — приход, отрицательное — расход. Ноль бессмыслен.
  qty          numeric(14,3) not null check (qty <> 0),
  reason       public.stock_reason not null,
  -- Ссылка на документ-основание: номер заказа, акта, поставки.
  doc_ref      text check (length(btrim(doc_ref)) between 1 and 128),
  note         text check (length(note) <= 1000),
  actor_id     uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
comment on table public.stock_movements is
  'Журнал движений товара. Только пополняется. Ошибка исправляется обратным движением.';
comment on column public.stock_movements.qty is
  'Со знаком. Остаток — это сумма движений, а не отдельное хранимое число.';

alter table public.stock_movements
  add constraint stock_movements_warehouse_fk
  foreign key (warehouse_id, tenant_id) references public.warehouses (id, tenant_id) on delete restrict;
alter table public.stock_movements
  add constraint stock_movements_variant_fk
  foreign key (variant_id, tenant_id) references public.product_variants (id, tenant_id) on delete restrict;

-- on delete restrict, а не cascade: удалить вариант или склад, по которому
-- было движение, нельзя — иначе история учёта исчезает вместе с ними.
-- Для вывода из оборота есть archived_at.

create index stock_movements_balance_idx
  on public.stock_movements (tenant_id, variant_id, warehouse_id);
create index stock_movements_recent_idx
  on public.stock_movements (tenant_id, created_at desc);
create index stock_movements_warehouse_idx on public.stock_movements (warehouse_id);
create index stock_movements_actor_idx on public.stock_movements (actor_id)
  where actor_id is not null;


-- ============================================================
-- ОСТАТКИ
-- ============================================================
-- Представление, а не таблица: остаток не может разойтись с журналом,
-- потому что это и есть журнал.
--
-- security_invoker обязателен: без него представление исполняется от имени
-- владельца и обходит RLS — то есть показывает остатки всех компаний.
create view public.stock_balances
with (security_invoker = on) as
  select
    m.tenant_id,
    m.variant_id,
    m.warehouse_id,
    sum(m.qty)              as qty,
    max(m.created_at)       as last_movement_at
  from public.stock_movements m
  group by m.tenant_id, m.variant_id, m.warehouse_id;

comment on view public.stock_balances is
  'Остаток по варианту и складу как сумма движений.';


-- ============================================================
-- RLS
-- ============================================================
alter table public.warehouses      enable row level security;
alter table public.stock_movements enable row level security;

-- Склады: обычные права каталога.
create policy warehouses_select on public.warehouses
  for select to authenticated using (app.is_member(tenant_id));
create policy warehouses_insert on public.warehouses
  for insert to authenticated with check (app.can_write_catalog(tenant_id));
create policy warehouses_update on public.warehouses
  for update to authenticated
  using (app.can_write_catalog(tenant_id)) with check (app.can_write_catalog(tenant_id));
create policy warehouses_delete on public.warehouses
  for delete to authenticated using (app.can_delete_catalog(tenant_id));
create policy warehouses_service on public.warehouses
  for all to service_role using (true) with check (true);

-- Журнал: только чтение и вставка.
-- Политик на update и delete НЕТ ни для кого, включая service_role.
-- При включённом RLS отсутствие политики означает запрет.
-- Это и есть append-only на уровне базы, а не договорённости.
create policy stock_movements_select on public.stock_movements
  for select to authenticated using (app.is_member(tenant_id));
create policy stock_movements_insert on public.stock_movements
  for insert to authenticated with check (app.can_write_catalog(tenant_id));

create policy stock_movements_service_select on public.stock_movements
  for select to service_role using (true);
create policy stock_movements_service_insert on public.stock_movements
  for insert to service_role with check (true);


-- ============================================================
-- ОПЕРАЦИИ
-- ============================================================
-- Перемещение — два движения, которые обязаны произойти вместе.
-- Два отдельных запроса с фронта при обрыве связи создали бы товар,
-- который ушёл с одного склада и никуда не пришёл.
create or replace function public.transfer_stock(
  p_tenant  uuid,
  p_variant uuid,
  p_from    uuid,
  p_to      uuid,
  p_qty     numeric,
  p_note    text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.can_write_catalog(p_tenant) then
    raise exception 'недостаточно прав для движений по складу' using errcode = '42501';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'количество перемещения должно быть положительным' using errcode = '23514';
  end if;

  if p_from = p_to then
    raise exception 'склад отправления и назначения совпадают' using errcode = '23514';
  end if;

  insert into public.stock_movements (tenant_id, warehouse_id, variant_id, qty, reason, note, actor_id)
  values
    (p_tenant, p_from, p_variant, -p_qty, 'transfer_out', p_note, auth.uid()),
    (p_tenant, p_to,   p_variant,  p_qty, 'transfer_in',  p_note, auth.uid());
end;
$$;

revoke all on function public.transfer_stock(uuid, uuid, uuid, uuid, numeric, text) from public, anon;
grant execute on function public.transfer_stock(uuid, uuid, uuid, uuid, numeric, text) to authenticated;

comment on function public.transfer_stock(uuid, uuid, uuid, uuid, numeric, text) is
  'Перемещение между складами одной транзакцией: списание и приход неразделимы.';

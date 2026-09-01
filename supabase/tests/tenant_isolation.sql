-- Тест изоляции тенантов.
-- Запускается целиком и откатывается — в базе после него ничего не остаётся.
-- Любая строка со значением ПРОВАЛ означает утечку данных между компаниями.

begin;

create temp table t (n int generated always as identity, "проверка" text, "получили" text, "ожидали" text) on commit drop;
grant all on t to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@sellerhub.test','x',now(),now()),
 ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@sellerhub.test','x',now(),now()),
 ('cccccccc-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@sellerhub.test','x',now(),now());

insert into public.tenants (id, name, slug) values
 ('11111111-0000-0000-0000-00000000000a','Tenant A','tenant-a'),
 ('22222222-0000-0000-0000-00000000000b','Tenant B','tenant-b');

-- Пользователь A — owner в тенанте A. Пользователь C — viewer в том же тенанте:
-- на нём проверяем, что права роли работают, а не только изоляция между компаниями.
insert into public.memberships (tenant_id, user_id, role) values
 ('11111111-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','owner'),
 ('22222222-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','owner'),
 ('11111111-0000-0000-0000-00000000000a','cccccccc-0000-0000-0000-000000000003','viewer');

insert into public.audit_log (tenant_id, actor_id, action, entity_type, entity_id) values
 ('11111111-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','create','product','A-1'),
 ('22222222-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','create','product','B-1');

insert into public.sync_jobs (tenant_id, marketplace, job_type) values
 ('11111111-0000-0000-0000-00000000000a','uzum','products.pull'),
 ('22222222-0000-0000-0000-00000000000b','uzum','products.pull');

-- КАТАЛОГ: по одной строке каждой сущности в каждом тенанте.
insert into public.categories (id, tenant_id, name, slug) values
 ('c0000000-0000-0000-0000-0000000000aa','11111111-0000-0000-0000-00000000000a','Обувь A','shoes-a'),
 ('c0000000-0000-0000-0000-0000000000bb','22222222-0000-0000-0000-00000000000b','Обувь B','shoes-b');

insert into public.brands (id, tenant_id, name, slug) values
 ('b0000000-0000-0000-0000-0000000000aa','11111111-0000-0000-0000-00000000000a','Бренд A','brand-a'),
 ('b0000000-0000-0000-0000-0000000000bb','22222222-0000-0000-0000-00000000000b','Бренд B','brand-b');

insert into public.products (id, tenant_id, category_id, brand_id, name) values
 ('40000000-0000-0000-0000-0000000000aa','11111111-0000-0000-0000-00000000000a','c0000000-0000-0000-0000-0000000000aa','b0000000-0000-0000-0000-0000000000aa','Кроссовки A'),
 ('40000000-0000-0000-0000-0000000000bb','22222222-0000-0000-0000-00000000000b','c0000000-0000-0000-0000-0000000000bb','b0000000-0000-0000-0000-0000000000bb','Кроссовки B');

insert into public.product_variants (id, tenant_id, product_id, sku, barcode, cost_price) values
 ('50000000-0000-0000-0000-0000000000aa','11111111-0000-0000-0000-00000000000a','40000000-0000-0000-0000-0000000000aa','SKU-SAME','4600000000001',100.00),
 ('50000000-0000-0000-0000-0000000000bb','22222222-0000-0000-0000-00000000000b','40000000-0000-0000-0000-0000000000bb','SKU-SAME','4600000000002',200.00);

insert into public.product_images (tenant_id, product_id, storage_path) values
 ('11111111-0000-0000-0000-00000000000a','40000000-0000-0000-0000-0000000000aa','a/1.jpg'),
 ('22222222-0000-0000-0000-00000000000b','40000000-0000-0000-0000-0000000000bb','b/1.jpg');

insert into public.marketplace_listings (tenant_id, variant_id, marketplace, external_id) values
 ('11111111-0000-0000-0000-00000000000a','50000000-0000-0000-0000-0000000000aa','uzum','EXT-1'),
 ('22222222-0000-0000-0000-00000000000b','50000000-0000-0000-0000-0000000000bb','uzum','EXT-1');

-- Один и тот же SKU у двух тенантов вставился без конфликта — так и задумано.
-- Уникальность SKU действует внутри тенанта, а не глобально.
insert into t ("проверка","получили","ожидали")
 select 'одинаковый SKU у двух тенантов', count(*)::text, '2'
 from public.product_variants where sku = 'SKU-SAME';

-- ============================================================
-- ПОЛЬЗОВАТЕЛЬ A (owner тенанта A)
-- ============================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

insert into t ("проверка","получили","ожидали") values
 ('кто я',                     (select auth.uid())::text,                        'aaaaaaaa-0000-0000-0000-000000000001'),
 ('видно тенантов',            (select count(*)::text from public.tenants),      '1'),
 ('виден чужой тенант B',      (select count(*)::text from public.tenants     where id = '22222222-0000-0000-0000-00000000000b'), '0'),
 ('видно членств',             (select count(*)::text from public.memberships),  '2'),
 ('видно записей аудита',      (select count(*)::text from public.audit_log),    '1'),
 ('видно задач синхронизации', (select count(*)::text from public.sync_jobs),    '1'),
 ('член чужого тенанта',       app.is_member('22222222-0000-0000-0000-00000000000b')::text, 'false'),
 ('член своего тенанта',       app.is_member('11111111-0000-0000-0000-00000000000a')::text, 'true');

-- Каталог: видно только своё
insert into t ("проверка","получили","ожидали") values
 ('видно категорий',   (select count(*)::text from public.categories),           '1'),
 ('видно брендов',     (select count(*)::text from public.brands),               '1'),
 ('видно товаров',     (select count(*)::text from public.products),             '1'),
 ('видно вариантов',   (select count(*)::text from public.product_variants),     '1'),
 ('видно изображений', (select count(*)::text from public.product_images),       '1'),
 ('видно связок',      (select count(*)::text from public.marketplace_listings), '1');

-- Каталог: чужие строки не видны поимённо
insert into t ("проверка","получили","ожидали") values
 ('виден чужой товар',   (select count(*)::text from public.products             where id = '40000000-0000-0000-0000-0000000000bb'), '0'),
 ('виден чужой вариант', (select count(*)::text from public.product_variants     where id = '50000000-0000-0000-0000-0000000000bb'), '0'),
 ('видна чужая связка',  (select count(*)::text from public.marketplace_listings where external_id = 'EXT-1' and tenant_id = '22222222-0000-0000-0000-00000000000b'), '0');

-- Попытки записи в чужой тенант
with u as (update public.tenants set name = 'ВЗЛОМАНО' where id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужой тенант', count(*)::text, '0' from u;

with d as (delete from public.audit_log where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'удалил чужой аудит', count(*)::text, '0' from d;

with j as (update public.sync_jobs set status = 'dead' where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужие задачи', count(*)::text, '0' from j;

with p as (update public.products set name = 'ВЗЛОМАНО' where id = '40000000-0000-0000-0000-0000000000bb' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужой товар', count(*)::text, '0' from p;

with v as (update public.product_variants set cost_price = 0 where id = '50000000-0000-0000-0000-0000000000bb' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужую себестоимость', count(*)::text, '0' from v;

with dp as (delete from public.products where id = '40000000-0000-0000-0000-0000000000bb' returning 1)
insert into t ("проверка","получили","ожидали") select 'удалил чужой товар', count(*)::text, '0' from dp;

with di as (delete from public.product_images where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'удалил чужие изображения', count(*)::text, '0' from di;

with dl as (delete from public.marketplace_listings where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'удалил чужие связки', count(*)::text, '0' from dl;

with m as (insert into public.memberships (tenant_id, user_id, role)
           select '22222222-0000-0000-0000-00000000000b','aaaaaaaa-0000-0000-0000-000000000001','owner'
           where app.has_role('22222222-0000-0000-0000-00000000000b', array['owner','admin']::public.member_role[])
           returning 1)
insert into t ("проверка","получили","ожидали") select 'вписал себя в чужой тенант', count(*)::text, '0' from m;

-- Вставка товара в чужой тенант должна быть отвергнута политикой INSERT.
do $$
declare v_inserted boolean := true;
begin
  begin
    insert into public.products (tenant_id, name) values ('22222222-0000-0000-0000-00000000000b','ПОДБРОШЕНО');
  exception when others then
    v_inserted := false;
  end;
  insert into t ("проверка","получили","ожидали")
    values ('вставил товар в чужой тенант', v_inserted::text, 'false');
end;
$$;

-- Межтенантная связка: вариант тенанта A под товар тенанта B.
-- Ловится составным внешним ключом (product_id, tenant_id), а не RLS:
-- по отдельности обе строки выглядят законными.
do $$
declare v_inserted boolean := true;
begin
  begin
    insert into public.product_variants (tenant_id, product_id, sku)
    values ('11111111-0000-0000-0000-00000000000a','40000000-0000-0000-0000-0000000000bb','CROSS-TENANT');
  exception when others then
    v_inserted := false;
  end;
  insert into t ("проверка","получили","ожидали")
    values ('привязал вариант к чужому товару', v_inserted::text, 'false');
end;
$$;

-- ============================================================
-- ПОЛЬЗОВАТЕЛЬ C (viewer в тенанте A) — права роли, не изоляция
-- ============================================================
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}';

insert into t ("проверка","получили","ожидали") values
 ('viewer видит товары своей компании', (select count(*)::text from public.products), '1'),
 ('viewer имеет право записи',          app.can_write_catalog('11111111-0000-0000-0000-00000000000a')::text, 'false');

with vw as (update public.products set name = 'ПРАВЛЕНО VIEWER-ОМ'
            where id = '40000000-0000-0000-0000-0000000000aa' returning 1)
insert into t ("проверка","получили","ожидали") select 'viewer изменил товар', count(*)::text, '0' from vw;

with vd as (delete from public.products where id = '40000000-0000-0000-0000-0000000000aa' returning 1)
insert into t ("проверка","получили","ожидали") select 'viewer удалил товар', count(*)::text, '0' from vd;

-- ============================================================
select "проверка", "получили", "ожидали",
       case when "получили" = "ожидали" then 'OK' else 'ПРОВАЛ' end as "итог"
from t order by n;

rollback;

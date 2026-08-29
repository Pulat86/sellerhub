-- Тест изоляции тенантов.
-- Запускается целиком и откатывается — в базе после него ничего не остаётся.
-- Любая строка со значением ПРОВАЛ означает утечку данных между компаниями.

begin;

create temp table t (n int generated always as identity, "проверка" text, "получили" text, "ожидали" text) on commit drop;
grant all on t to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@sellerhub.test','x',now(),now()),
 ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@sellerhub.test','x',now(),now());

insert into public.tenants (id, name, slug) values
 ('11111111-0000-0000-0000-00000000000a','Tenant A','tenant-a'),
 ('22222222-0000-0000-0000-00000000000b','Tenant B','tenant-b');

insert into public.memberships (tenant_id, user_id, role) values
 ('11111111-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','owner'),
 ('22222222-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','owner');

insert into public.audit_log (tenant_id, actor_id, action, entity_type, entity_id) values
 ('11111111-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','create','product','A-1'),
 ('22222222-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','create','product','B-1');

insert into public.sync_jobs (tenant_id, marketplace, job_type) values
 ('11111111-0000-0000-0000-00000000000a','uzum','products.pull'),
 ('22222222-0000-0000-0000-00000000000b','uzum','products.pull');

-- Дальше работаем как пользователь A через роль authenticated: RLS применяется
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

insert into t ("проверка","получили","ожидали") values
 ('кто я',                     (select auth.uid())::text,                        'aaaaaaaa-0000-0000-0000-000000000001'),
 ('видно тенантов',            (select count(*)::text from public.tenants),      '1'),
 ('виден чужой тенант B',      (select count(*)::text from public.tenants     where id = '22222222-0000-0000-0000-00000000000b'), '0'),
 ('видно членств',             (select count(*)::text from public.memberships),  '1'),
 ('видно записей аудита',      (select count(*)::text from public.audit_log),    '1'),
 ('видно задач синхронизации', (select count(*)::text from public.sync_jobs),    '1'),
 ('член чужого тенанта',       app.is_member('22222222-0000-0000-0000-00000000000b')::text, 'false'),
 ('член своего тенанта',       app.is_member('11111111-0000-0000-0000-00000000000a')::text, 'true');

with u as (update public.tenants set name = 'ВЗЛОМАНО' where id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужой тенант', count(*)::text, '0' from u;

with d as (delete from public.audit_log where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'удалил чужой аудит', count(*)::text, '0' from d;

with j as (update public.sync_jobs set status = 'dead' where tenant_id = '22222222-0000-0000-0000-00000000000b' returning 1)
insert into t ("проверка","получили","ожидали") select 'изменил чужие задачи', count(*)::text, '0' from j;

with m as (insert into public.memberships (tenant_id, user_id, role)
           select '22222222-0000-0000-0000-00000000000b','aaaaaaaa-0000-0000-0000-000000000001','owner'
           where app.has_role('22222222-0000-0000-0000-00000000000b', array['owner','admin']::public.member_role[])
           returning 1)
insert into t ("проверка","получили","ожидали") select 'вписал себя в чужой тенант', count(*)::text, '0' from m;

select "проверка", "получили", "ожидали",
       case when "получили" = "ожидали" then 'OK' else 'ПРОВАЛ' end as "итог"
from t order by n;

rollback;

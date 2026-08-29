-- SellerHub 0001: ядро мультитенантности
-- Приватная схема для хелперов: не публикуется через PostgREST
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Роли участника и статус членства
create type public.member_role   as enum ('owner','admin','manager','warehouse','viewer');
create type public.member_status as enum ('active','invited','disabled');

-- Общий триггер обновления updated_at
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Тенант = компания продавца
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 200),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$'),
  locale     text not null default 'ru' check (locale in ('ru','uz','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tenants is 'Компания-продавец. Корень изоляции данных: каждая таблица данных ссылается сюда через tenant_id.';

create trigger tenants_touch before update on public.tenants
  for each row execute function app.touch_updated_at();

-- Профиль пользователя (расширение auth.users)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  locale     text not null default 'ru' check (locale in ('ru','uz','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Профиль пользователя системы. Не кадровый учёт — HR вне объёма (решение Р-005).';

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Членство пользователя в тенанте с ролью
create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  role       public.member_role   not null default 'viewer',
  status     public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
comment on table public.memberships is 'Кто и с какой ролью работает в тенанте. Единственный источник правды для RLS.';

create index memberships_user_active_idx on public.memberships (user_id) where status = 'active';
create index memberships_tenant_idx      on public.memberships (tenant_id);

create trigger memberships_touch before update on public.memberships
  for each row execute function app.touch_updated_at();

-- ХЕЛПЕРЫ RLS
-- security definer: обходят RLS сами, иначе политика на memberships рекурсивно вызывала бы себя.
-- search_path = '' обязателен: иначе через подменённый search_path можно подсунуть свои объекты.

create or replace function app.is_member(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant
      and m.user_id   = (select auth.uid())
      and m.status    = 'active'
  );
$$;

create or replace function app.has_role(p_tenant uuid, p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant
      and m.user_id   = (select auth.uid())
      and m.status    = 'active'
      and m.role      = any(p_roles)
  );
$$;

revoke all on function app.is_member(uuid)                        from public;
revoke all on function app.has_role(uuid, public.member_role[])   from public;
grant execute on function app.is_member(uuid)                      to authenticated;
grant execute on function app.has_role(uuid, public.member_role[]) to authenticated;

-- RLS
alter table public.tenants     enable row level security;
alter table public.profiles    enable row level security;
alter table public.memberships enable row level security;

-- tenants: видно только свои. Создание — только через RPC create_tenant.
create policy tenants_select on public.tenants
  for select to authenticated using (app.is_member(id));
create policy tenants_update on public.tenants
  for update to authenticated
  using      (app.has_role(id, array['owner','admin']::public.member_role[]))
  with check (app.has_role(id, array['owner','admin']::public.member_role[]));
create policy tenants_delete on public.tenants
  for delete to authenticated using (app.has_role(id, array['owner']::public.member_role[]));

-- profiles: свой профиль всегда; профили коллег по тенанту — только чтение
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_select_colleagues on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.memberships me
      join public.memberships other on other.tenant_id = me.tenant_id
      where me.user_id = (select auth.uid()) and me.status = 'active'
        and other.user_id = public.profiles.id and other.status = 'active'
    )
  );
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- memberships: видно состав своего тенанта; менять состав могут owner/admin
create policy memberships_select on public.memberships
  for select to authenticated using (app.is_member(tenant_id));
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (app.has_role(tenant_id, array['owner','admin']::public.member_role[]));
create policy memberships_update on public.memberships
  for update to authenticated
  using      (app.has_role(tenant_id, array['owner','admin']::public.member_role[]))
  with check (app.has_role(tenant_id, array['owner','admin']::public.member_role[]));
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (app.has_role(tenant_id, array['owner','admin']::public.member_role[]));

-- Создание тенанта: атомарно тенант + владелец.
create or replace function public.create_tenant(p_name text, p_slug text)
returns public.tenants language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_tenant public.tenants;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.tenants (name, slug) values (p_name, p_slug) returning * into v_tenant;
  insert into public.memberships (tenant_id, user_id, role, status)
    values (v_tenant.id, v_uid, 'owner', 'active');
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  return v_tenant;
end;
$$;

revoke all on function public.create_tenant(text, text) from public;
grant execute on function public.create_tenant(text, text) to authenticated;

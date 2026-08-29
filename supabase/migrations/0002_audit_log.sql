-- SellerHub 0002: журнал аудита
create table public.audit_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null check (action in ('create','update','delete','login','sync','bulk')),
  entity_type text not null,
  entity_id   text,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.audit_log is 'Кто что изменил. Только запись через app.audit(); правка и удаление запрещены политиками.';

create index audit_log_tenant_time_idx on public.audit_log (tenant_id, created_at desc);
create index audit_log_entity_idx      on public.audit_log (tenant_id, entity_type, entity_id);

alter table public.audit_log enable row level security;

-- Читать журнал своего тенанта может любой участник; писать напрямую нельзя никому.
create policy audit_log_select on public.audit_log
  for select to authenticated using (app.is_member(tenant_id));

-- Единственный вход для записи.
create or replace function app.audit(
  p_tenant uuid, p_action text, p_entity_type text,
  p_entity_id text default null, p_diff jsonb default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_member(p_tenant) then
    raise exception 'not a member of tenant %', p_tenant using errcode = '42501';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity_type, entity_id, diff)
  values (p_tenant, (select auth.uid()), p_action, p_entity_type, p_entity_id, p_diff);
end;
$$;

revoke all on function app.audit(uuid, text, text, text, jsonb) from public;
grant execute on function app.audit(uuid, text, text, text, jsonb) to authenticated;

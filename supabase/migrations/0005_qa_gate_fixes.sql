-- SellerHub 0005: правки по итогам приёмки Sprint 0

-- Дефект 1 (minor, производительность).
-- Внешний ключ audit_log.actor_id без покрывающего индекса.
-- Проявится при удалении пользователя и при выборке «что делал сотрудник».
create index audit_log_actor_idx on public.audit_log (actor_id) where actor_id is not null;

-- Дефект 2 (minor, производительность).
-- На profiles висели две разрешающие политики SELECT для роли authenticated.
-- Postgres выполняет обе на каждый запрос. Схлопываем в одну через OR —
-- логика доступа та же: свой профиль плюс профили коллег по тенанту.
drop policy profiles_select_self on public.profiles;
drop policy profiles_select_colleagues on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.memberships me
      join public.memberships other on other.tenant_id = me.tenant_id
      where me.user_id = (select auth.uid()) and me.status = 'active'
        and other.user_id = public.profiles.id and other.status = 'active'
    )
  );

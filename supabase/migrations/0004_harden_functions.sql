-- SellerHub 0004: закрываем замечания линтера безопасности Supabase

-- 1. Триггерная функция без фиксированного search_path — вектор подмены объектов
create or replace function app.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. create_tenant был доступен анонимному пользователю через /rest/v1/rpc/.
-- Закрываем на уровне прав, а не полагаемся на проверку внутри функции.
revoke all on function public.create_tenant(text, text) from anon;

-- Хелперы app.* анонимному пользователю не нужны
revoke all on function app.is_member(uuid)                      from anon;
revoke all on function app.has_role(uuid, public.member_role[]) from anon;
revoke all on function app.audit(uuid, text, text, text, jsonb) from anon;
revoke usage on schema app from anon;

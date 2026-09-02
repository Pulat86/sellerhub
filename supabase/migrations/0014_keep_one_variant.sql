-- SellerHub 0014: у товара всегда остаётся хотя бы один вариант
--
-- Артикул, штрихкод, себестоимость и остаток живут на варианте, а не на товаре.
-- Товар без вариантов — это строка, которую нельзя ни продать, ни принять на склад.
--
-- Правило стоит в базе, а не во фронте: его нарушит не только экран,
-- но и адаптер маркетплейса, и массовая операция, и ручной запрос в консоли.

create or replace function app.prevent_last_variant_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_left int;
begin
  -- Удаляется сам товар — варианты уходят каскадом, это законно.
  -- На момент каскада родительской строки уже нет.
  if not exists (select 1 from public.products p where p.id = old.product_id) then
    return old;
  end if;

  select count(*) into v_left
    from public.product_variants v
   where v.product_id  = old.product_id
     and v.tenant_id   = old.tenant_id
     and v.archived_at is null
     and v.id <> old.id;

  if v_left = 0 then
    raise exception 'у товара должен остаться хотя бы один вариант'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

create trigger product_variants_keep_one
  before delete on public.product_variants
  for each row execute function app.prevent_last_variant_removal();


-- Архивация последнего варианта — то же самое удаление по последствиям:
-- товар останется без единого активного артикула.
-- Архивировать нужно товар целиком.
create or replace function app.prevent_last_variant_archive()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_left int;
begin
  if old.archived_at is not null or new.archived_at is null then
    return new;
  end if;

  -- Товар архивируется целиком — вариантам тоже можно в архив.
  if exists (
    select 1 from public.products p
     where p.id = new.product_id and p.archived_at is not null
  ) then
    return new;
  end if;

  select count(*) into v_left
    from public.product_variants v
   where v.product_id  = new.product_id
     and v.tenant_id   = new.tenant_id
     and v.archived_at is null
     and v.id <> new.id;

  if v_left = 0 then
    raise exception 'у товара должен остаться хотя бы один активный вариант'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_variants_keep_one_active
  before update of archived_at on public.product_variants
  for each row execute function app.prevent_last_variant_archive();

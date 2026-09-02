-- SellerHub 0013: чиним on delete set null у составных внешних ключей
--
-- Дефект из 0011. Составной ключ (category_id, tenant_id) с простым
-- on delete set null при удалении категории обнуляет ОБЕ колонки,
-- включая tenant_id. А tenant_id объявлен not null — значит удаление
-- любой категории или бренда упало бы с нарушением not null.
--
-- Не всплыло раньше, потому что экрана удаления справочников ещё не было.
--
-- Postgres 15+ позволяет указать, какую именно колонку обнулять.
-- MATCH SIMPLE считает ключ удовлетворённым, если хотя бы одна колонка null,
-- поэтому товар останется в своём тенанте, просто без категории.

alter table public.products drop constraint products_category_fk;
alter table public.products
  add constraint products_category_fk
  foreign key (category_id, tenant_id) references public.categories (id, tenant_id)
  on delete set null (category_id);

alter table public.products drop constraint products_brand_fk;
alter table public.products
  add constraint products_brand_fk
  foreign key (brand_id, tenant_id) references public.brands (id, tenant_id)
  on delete set null (brand_id);

alter table public.categories drop constraint categories_parent_fk;
alter table public.categories
  add constraint categories_parent_fk
  foreign key (parent_id, tenant_id) references public.categories (id, tenant_id)
  on delete set null (parent_id);

-- Изображения: там on delete cascade — строка удаляется целиком,
-- обнулять нечего. Правка не нужна.

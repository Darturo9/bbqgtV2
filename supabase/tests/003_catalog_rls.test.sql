begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(36);

grant usage on schema extensions to anon, authenticated;
grant execute on function extensions."is"(anyelement, anyelement, text) to anon, authenticated;
grant execute on function extensions.throws_ok(text, character, text, text) to anon, authenticated;

insert into public.brands (id, name, slug, is_active) values
  ('a0000000-0000-4000-8000-000000000001', 'Marca Activa', 'marca-activa', true),
  ('a0000000-0000-4000-8000-000000000002', 'Marca Inactiva', 'marca-inactiva', false);

insert into public.locations (id, brand_id, name, slug, is_active) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Sede Activa', 'sede-activa', true),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Sede Inactiva', 'sede-inactiva', false),
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Sede Marca Inactiva', 'sede-marca-inactiva', true);

insert into public.categories (id, brand_id, name, slug, is_active) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Categoría Activa', 'categoria-activa', true),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Categoría Inactiva', 'categoria-inactiva', false),
  ('a2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Categoría Marca Inactiva', 'categoria-marca-inactiva', true);

insert into public.products (id, brand_id, category_id, name, slug, regular_price_cents, is_active) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Producto Activo', 'producto-activo', 5000, true),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Producto Inactivo', 'producto-inactivo', 5000, false),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'Producto de Categoría Inactiva', 'producto-categoria-inactiva', 5000, true),
  ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Producto Sin Disponibilidad', 'producto-sin-disponibilidad', 5000, true),
  ('a3000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000003', 'Producto Marca Inactiva', 'producto-marca-inactiva', 5000, true);

insert into public.modifier_groups (id, brand_id, name, selection_type, min_selections, max_selections, is_active) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Grupo Padre', 'single', 0, 1, true),
  ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Grupo Inactivo', 'single', 0, 1, false),
  ('a4000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Grupo Hijo', 'multiple', 0, 2, true),
  ('a4000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Grupo Marca Inactiva', 'single', 0, 1, true),
  ('a4000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Grupo Hijo Marca Inactiva', 'single', 0, 1, true);

insert into public.modifier_options (id, brand_id, modifier_group_id, name, is_active) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Opción Activa', true),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Opción Inactiva', false),
  ('a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'Opción de Grupo Inactivo', true),
  ('a5000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000003', 'Opción Sin Disponibilidad', true),
  ('a5000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000004', 'Opción Marca Inactiva', true);

insert into public.category_modifier_groups (brand_id, category_id, modifier_group_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000004');

insert into public.category_modifier_group_exclusions (brand_id, category_id, modifier_group_id, product_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000005');

insert into public.product_modifier_groups (brand_id, product_id, modifier_group_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'a4000000-0000-4000-8000-000000000004');

insert into public.modifier_conditions (brand_id, parent_modifier_group_id, activating_modifier_option_id, child_modifier_group_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000005', 'a4000000-0000-4000-8000-000000000005');

insert into public.location_products (brand_id, location_id, product_id, is_available) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', false),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000005', true);

insert into public.location_modifier_options (brand_id, location_id, modifier_option_id, is_available) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000003', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000001', true),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000004', false),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000005', true);

select extensions.is((select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options', 'category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'), 24::bigint, 'both client roles receive SELECT on all catalog tables');
select extensions.is((select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options', 'category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT'), 0::bigint, 'client roles receive no catalog write privileges');
select extensions.is((select count(*) from pg_policy p join pg_class t on t.oid = p.polrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options', 'category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options')), 12::bigint, 'catalog has one policy per table');
select extensions.is((select count(*) from pg_policy p join pg_class t on t.oid = p.polrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options', 'category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and p.polcmd = 'r' and p.polroles @> array[(select oid from pg_roles where rolname = 'anon'), (select oid from pg_roles where rolname = 'authenticated')]::oid[]), 12::bigint, 'every catalog policy is SELECT-only for both client roles');
select extensions.ok(has_schema_privilege('anon', 'public', 'usage'), 'anon can use the public schema');
select extensions.ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated can use the public schema');

set local role anon;

select extensions.is((select count(*) from public.brands where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only active brands');
select extensions.is((select count(*) from public.locations where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon hides inactive locations and locations of inactive brands');
select extensions.is((select count(*) from public.categories where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon hides inactive categories and categories of inactive brands');
select extensions.is((select count(*) from public.products where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'anon hides inactive products and products with inactive parents');
select extensions.is((select count(*) from public.modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'anon hides inactive modifier groups and groups of inactive brands');
select extensions.is((select count(*) from public.modifier_options where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'anon hides inactive options and options with inactive parents');
select extensions.is((select count(*) from public.category_modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only active inherited assignments');
select extensions.is((select count(*) from public.category_modifier_group_exclusions where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only exclusions with visible endpoints');
select extensions.is((select count(*) from public.product_modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only direct assignments with visible endpoints');
select extensions.is((select count(*) from public.modifier_conditions where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only conditions with visible endpoints');
select extensions.is((select count(*) from public.location_products where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only true product availability with visible endpoints');
select extensions.is((select count(*) from public.location_modifier_options where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'anon reads only true option availability with visible endpoints');
select extensions.throws_ok($$insert into public.brands (name, slug) values ('Intrusa', 'intrusa')$$, '42501', null, 'anon cannot insert catalog data');
select extensions.throws_ok($$update public.brands set name = 'Alterada' where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'anon cannot update catalog data');
select extensions.throws_ok($$delete from public.brands where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'anon cannot delete catalog data');

reset role;
set local role authenticated;

select extensions.is((select count(*) from public.brands where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same active brands');
select extensions.is((select count(*) from public.locations where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same active locations');
select extensions.is((select count(*) from public.categories where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same active categories');
select extensions.is((select count(*) from public.products where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'authenticated reads the same active products');
select extensions.is((select count(*) from public.modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'authenticated reads the same active modifier groups');
select extensions.is((select count(*) from public.modifier_options where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 2::bigint, 'authenticated reads the same active modifier options');
select extensions.is((select count(*) from public.category_modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same inherited assignments');
select extensions.is((select count(*) from public.category_modifier_group_exclusions where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same exclusions');
select extensions.is((select count(*) from public.product_modifier_groups where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same direct assignments');
select extensions.is((select count(*) from public.modifier_conditions where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same modifier conditions');
select extensions.is((select count(*) from public.location_products where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same product availability');
select extensions.is((select count(*) from public.location_modifier_options where brand_id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002')), 1::bigint, 'authenticated reads the same option availability');
select extensions.throws_ok($$insert into public.brands (name, slug) values ('Intrusa', 'intrusa')$$, '42501', null, 'authenticated cannot insert catalog data');
select extensions.throws_ok($$update public.brands set name = 'Alterada' where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'authenticated cannot update catalog data');
select extensions.throws_ok($$delete from public.brands where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'authenticated cannot delete catalog data');

reset role;

select * from extensions.finish();

rollback;

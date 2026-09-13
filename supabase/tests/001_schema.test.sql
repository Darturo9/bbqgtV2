begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(29);

select extensions.ok(
  exists (select 1 from pg_namespace where nspname = 'private'),
  'private schema exists'
);

select extensions.ok(to_regclass('public.brands') is not null, 'brands table exists');
select extensions.ok(to_regclass('public.locations') is not null, 'locations table exists');
select extensions.ok(to_regclass('public.categories') is not null, 'categories table exists');
select extensions.ok(to_regclass('public.products') is not null, 'products table exists');
select extensions.ok(to_regclass('public.modifier_groups') is not null, 'modifier_groups table exists');
select extensions.ok(to_regclass('public.modifier_options') is not null, 'modifier_options table exists');

select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'brands'),
  array['id', 'name', 'slug', 'currency_code', 'is_active', 'created_at', 'updated_at']::text[],
  'brands exposes the expected columns'
);
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'locations'),
  array['id', 'brand_id', 'name', 'slug', 'is_active', 'created_at', 'updated_at']::text[],
  'locations exposes the expected columns'
);
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'categories'),
  array['id', 'brand_id', 'name', 'slug', 'description', 'display_order', 'is_active', 'created_at', 'updated_at']::text[],
  'categories exposes the expected columns'
);
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'products'),
  array['id', 'brand_id', 'category_id', 'name', 'slug', 'description', 'regular_price_cents', 'offer_price_cents', 'image_path', 'display_order', 'is_active', 'created_at', 'updated_at']::text[],
  'products exposes the expected columns'
);
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'modifier_groups'),
  array['id', 'brand_id', 'name', 'description', 'selection_type', 'min_selections', 'max_selections', 'display_order', 'is_active', 'created_at', 'updated_at']::text[],
  'modifier_groups exposes the expected columns'
);
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'modifier_options'),
  array['id', 'brand_id', 'modifier_group_id', 'name', 'description', 'price_adjustment_cents', 'display_order', 'is_active', 'created_at', 'updated_at']::text[],
  'modifier_options exposes the expected columns'
);

select extensions.is(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options') and column_name in ('id', 'brand_id', 'category_id', 'modifier_group_id') and data_type = 'uuid'),
  13::bigint,
  'identifiers use uuid'
);
select extensions.is(
  (select count(*) from information_schema.columns where table_schema = 'public' and ((table_name = 'products' and column_name in ('regular_price_cents', 'offer_price_cents')) or (table_name = 'modifier_options' and column_name = 'price_adjustment_cents')) and data_type = 'bigint'),
  3::bigint,
  'money values use bigint cents'
);
select extensions.is(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options') and column_name = 'is_active' and data_type = 'boolean'),
  6::bigint,
  'active flags use boolean'
);
select extensions.is(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options') and column_name in ('created_at', 'updated_at') and data_type = 'timestamp with time zone'),
  12::bigint,
  'audit timestamps include time zone'
);

select extensions.is((select count(*) from pg_constraint where contype = 'p' and conrelid in ('public.brands'::regclass, 'public.locations'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.modifier_groups'::regclass, 'public.modifier_options'::regclass)), 6::bigint, 'all catalog tables have primary keys');
select extensions.is((select count(*) from pg_constraint where contype = 'u' and conrelid in ('public.brands'::regclass, 'public.locations'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.modifier_groups'::regclass, 'public.modifier_options'::regclass)), 11::bigint, 'catalog has the required uniqueness constraints');
select extensions.is((select count(*) from pg_constraint where contype = 'f' and conrelid in ('public.locations'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.modifier_groups'::regclass, 'public.modifier_options'::regclass)), 7::bigint, 'catalog has the required foreign keys');
select extensions.ok((select bool_and(exists (select 1 from pg_constraint c where c.conrelid = t.oid and c.contype = 'c')) from pg_class t join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('brands', 'locations', 'categories', 'products', 'modifier_groups', 'modifier_options')), 'all catalog tables have check constraints');
select extensions.ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.brands'::regclass, 'public.locations'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.modifier_groups'::regclass, 'public.modifier_options'::regclass)), 'RLS is enabled on all catalog tables');

select extensions.ok(not has_schema_privilege('public', 'private', 'usage'), 'PUBLIC cannot use private schema');
select extensions.ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon cannot use private schema');
select extensions.ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated cannot use private schema');
select extensions.ok(to_regprocedure('private.set_updated_at()') is not null, 'timestamp trigger function exists');
select extensions.ok(not (select prosecdef from pg_proc where oid = 'private.set_updated_at()'::regprocedure), 'timestamp function is security invoker');
select extensions.ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'private.set_updated_at()'::regprocedure), 'timestamp function has an empty fixed search_path');
select extensions.is((select count(*) from pg_trigger where not tgisinternal and tgname = 'set_updated_at' and tgrelid in ('public.brands'::regclass, 'public.locations'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.modifier_groups'::regclass, 'public.modifier_options'::regclass)), 6::bigint, 'all catalog tables update updated_at through a trigger');
select * from extensions.finish();

rollback;

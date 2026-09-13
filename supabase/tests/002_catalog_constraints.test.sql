begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(67);

select extensions.lives_ok($$
  insert into public.brands (id, name, slug) values
    ('10000000-0000-4000-8000-000000000001', 'Marca Uno', 'marca-uno'),
    ('10000000-0000-4000-8000-000000000002', 'Marca Dos', 'marca-dos')
$$, 'accepts valid brands');

select extensions.lives_ok($$
  insert into public.locations (id, brand_id, name, slug) values
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Zona 1', 'zona-1'),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Zona 2', 'zona-2')
$$, 'accepts a valid location');

select extensions.lives_ok($$
  insert into public.categories (id, brand_id, name, slug) values
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Combos', 'combos'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Combos', 'combos'),
    ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Platos', 'platos')
$$, 'allows the same category slug in different brands');

select extensions.lives_ok($$
  insert into public.products (id, brand_id, category_id, name, slug, regular_price_cents, offer_price_cents) values
    ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Combo Uno', 'combo-uno', 7500, 6500),
    ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Plato Uno', 'plato-uno', 5000, null),
    ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Combo Dos', 'combo-dos', 8000, null)
$$, 'accepts valid regular and offer prices');

select extensions.lives_ok($$
  insert into public.modifier_groups (id, brand_id, name, selection_type, min_selections, max_selections) values
    ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Tamaño', 'single', 1, 1),
    ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Salsas', 'multiple', 0, 3),
    ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Acompañamiento', 'multiple', 0, 2)
$$, 'accepts valid modifier groups');

select extensions.lives_ok($$
  insert into public.modifier_options (id, brand_id, modifier_group_id, name, price_adjustment_cents) values
    ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Grande', 1000),
    ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Mediano', 0),
    ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Sin acompañamiento', -500),
    ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Barbacoa', 0)
$$, 'accepts positive, zero, and negative adjustments');

select extensions.throws_ok($$insert into public.brands (name, slug) values (' ', 'vacia')$$, '23514', null, 'rejects an empty brand name');
select extensions.throws_ok($$insert into public.brands (name, slug) values ('Marca', 'Marca inválida')$$, '23514', null, 'rejects an invalid slug');
select extensions.throws_ok($$insert into public.brands (name, slug, currency_code) values ('Marca', 'otra-moneda', 'USD')$$, '23514', null, 'only accepts GTQ in the first release');
select extensions.throws_ok($$insert into public.categories (brand_id, name, slug) values ('10000000-0000-4000-8000-000000000001', '', 'sin-nombre')$$, '23514', null, 'rejects an empty category name');
select extensions.throws_ok($$insert into public.categories (brand_id, name, slug) values ('10000000-0000-4000-8000-000000000001', 'Repetida', 'combos')$$, '23505', null, 'rejects a repeated category slug in one brand');
select extensions.throws_ok($$insert into public.categories (brand_id, name, slug, display_order) values ('10000000-0000-4000-8000-000000000001', 'Orden', 'orden-invalido', -1)$$, '23514', null, 'rejects a negative category order');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Gratis', 'gratis', 0)$$, '23514', null, 'rejects a zero regular price');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents, offer_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Oferta cero', 'oferta-cero', 1000, 0)$$, '23514', null, 'rejects a zero offer price');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents, offer_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Oferta igual', 'oferta-igual', 1000, 1000)$$, '23514', null, 'rejects an offer equal to the regular price');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents, offer_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Oferta mayor', 'oferta-mayor', 1000, 1200)$$, '23514', null, 'rejects an offer above the regular price');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents, display_order) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Orden', 'producto-orden', 1000, -1)$$, '23514', null, 'rejects a negative product order');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Cruce', 'producto-cruzado', 1000)$$, '23503', null, 'rejects a category from another brand');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections) values ('10000000-0000-4000-8000-000000000001', 'Tipo', 'unknown', 0, 1)$$, '23514', null, 'rejects an unknown selection type');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections) values ('10000000-0000-4000-8000-000000000001', 'Mínimo', 'multiple', -1, 1)$$, '23514', null, 'rejects a negative minimum');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections) values ('10000000-0000-4000-8000-000000000001', 'Máximo', 'multiple', 0, 0)$$, '23514', null, 'requires at least one maximum selection');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections) values ('10000000-0000-4000-8000-000000000001', 'Rango', 'multiple', 3, 2)$$, '23514', null, 'rejects an inverted selection range');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections) values ('10000000-0000-4000-8000-000000000001', 'Único', 'single', 0, 2)$$, '23514', null, 'limits a single group to one selection');
select extensions.throws_ok($$insert into public.modifier_groups (brand_id, name, selection_type, min_selections, max_selections, display_order) values ('10000000-0000-4000-8000-000000000001', 'Orden', 'multiple', 0, 2, -1)$$, '23514', null, 'rejects a negative modifier group order');
select extensions.throws_ok($$insert into public.modifier_options (brand_id, modifier_group_id, name) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', ' ')$$, '23514', null, 'rejects an empty modifier option name');
select extensions.throws_ok($$insert into public.modifier_options (brand_id, modifier_group_id, name, display_order) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Orden', -1)$$, '23514', null, 'rejects a negative modifier option order');
select extensions.throws_ok($$insert into public.modifier_options (brand_id, modifier_group_id, name) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Cruce')$$, '23503', null, 'rejects a modifier group from another brand');
select extensions.throws_ok($$insert into public.locations (brand_id, name, slug) values ('10000000-0000-4000-8000-000000000001', ' ', 'ubicacion-vacia')$$, '23514', null, 'rejects an empty location name');
select extensions.throws_ok($$insert into public.products (brand_id, category_id, name, slug, regular_price_cents) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', ' ', 'producto-vacio', 1000)$$, '23514', null, 'rejects an empty product name');

select extensions.ok(to_regclass('public.category_modifier_groups') is not null, 'category_modifier_groups table exists');
select extensions.ok(to_regclass('public.category_modifier_group_exclusions') is not null, 'category_modifier_group_exclusions table exists');
select extensions.ok(to_regclass('public.product_modifier_groups') is not null, 'product_modifier_groups table exists');
select extensions.ok(to_regclass('public.modifier_conditions') is not null, 'modifier_conditions table exists');
select extensions.ok(to_regclass('public.location_products') is not null, 'location_products table exists');
select extensions.ok(to_regclass('public.location_modifier_options') is not null, 'location_modifier_options table exists');
select extensions.is((select count(*) from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and c.contype = 'p'), 6::bigint, 'all relationship tables have composite primary keys');
select extensions.is((select count(*) from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and c.contype = 'f'), 12::bigint, 'relationship tables have the required foreign keys');
select extensions.ok((select bool_and(t.relrowsecurity) from pg_class t join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options')), 'RLS is enabled on all relationship tables');
select extensions.is((select count(*) from pg_policy p join pg_class t on t.oid = p.polrelid where t.relname in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options')), 0::bigint, 'stage 3 creates no relationship policies');
select extensions.ok(not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and grantee in ('anon', 'authenticated')), 'Data API roles receive no relationship privileges yet');
select extensions.is((select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options') and column_name in ('created_at', 'updated_at') and data_type = 'timestamp with time zone' and is_nullable = 'NO'), 12::bigint, 'relationship audit timestamps include time zone and are required');
select extensions.is((select count(*) from pg_trigger tr join pg_class t on t.oid = tr.tgrelid join pg_namespace n on n.oid = t.relnamespace where not tr.tgisinternal and tr.tgname = 'set_updated_at' and n.nspname = 'public' and t.relname in ('category_modifier_groups', 'category_modifier_group_exclusions', 'product_modifier_groups', 'modifier_conditions', 'location_products', 'location_modifier_options')), 6::bigint, 'all relationship tables update updated_at through a trigger');
select extensions.is((select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('location_products', 'location_modifier_options') and column_name = 'is_available' and data_type = 'boolean' and is_nullable = 'NO' and column_default = 'false'), 2::bigint, 'availability is required and defaults to false');

select extensions.lives_ok($$insert into public.category_modifier_groups (brand_id, category_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')$$, 'accepts a valid inherited modifier assignment');
select extensions.lives_ok($$insert into public.product_modifier_groups (brand_id, product_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003')$$, 'accepts a valid direct modifier assignment');
select extensions.lives_ok($$insert into public.category_modifier_group_exclusions (brand_id, category_id, modifier_group_id, product_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')$$, 'accepts an exclusion backed by a category assignment');
select extensions.lives_ok($$insert into public.modifier_conditions (brand_id, parent_modifier_group_id, activating_modifier_option_id, child_modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003')$$, 'accepts a valid modifier condition');
select extensions.lives_ok($$insert into public.location_products (brand_id, location_id, product_id, is_available) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', true), ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', false)$$, 'accepts true and false product availability');
select extensions.lives_ok($$insert into public.location_modifier_options (brand_id, location_id, modifier_option_id, is_available) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', true), ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', false)$$, 'accepts true and false option availability');
select extensions.is((select count(*) from public.location_products where is_available), 1::bigint, 'stores available products distinctly');
select extensions.is((select count(*) from public.location_products where not is_available), 1::bigint, 'stores unavailable products distinctly');
select extensions.is((select count(*) from public.location_modifier_options where is_available), 1::bigint, 'stores available options distinctly');
select extensions.is((select count(*) from public.location_modifier_options where not is_available), 1::bigint, 'stores unavailable options distinctly');

select extensions.throws_ok($$insert into public.category_modifier_groups (brand_id, category_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')$$, '23505', null, 'rejects a duplicate inherited assignment');
select extensions.throws_ok($$insert into public.product_modifier_groups (brand_id, product_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003')$$, '23505', null, 'rejects a duplicate direct assignment');
select extensions.throws_ok($$insert into public.category_modifier_group_exclusions (brand_id, category_id, modifier_group_id, product_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')$$, '23505', null, 'rejects a duplicate exclusion');
select extensions.throws_ok($$insert into public.modifier_conditions (brand_id, parent_modifier_group_id, activating_modifier_option_id, child_modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003')$$, '23505', null, 'rejects a duplicate modifier condition');
select extensions.throws_ok($$insert into public.location_products (brand_id, location_id, product_id, is_available) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', false)$$, '23505', null, 'rejects duplicate product availability');
select extensions.throws_ok($$insert into public.location_modifier_options (brand_id, location_id, modifier_option_id, is_available) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', false)$$, '23505', null, 'rejects duplicate option availability');

select extensions.throws_ok($$insert into public.category_modifier_groups (brand_id, category_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002')$$, '23503', null, 'rejects an inherited group from another brand');
select extensions.throws_ok($$insert into public.product_modifier_groups (brand_id, product_id, modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002')$$, '23503', null, 'rejects a direct group from another brand');
select extensions.throws_ok($$insert into public.category_modifier_group_exclusions (brand_id, category_id, modifier_group_id, product_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001')$$, '23503', null, 'rejects an exclusion without its inherited assignment');
select extensions.throws_ok($$insert into public.category_modifier_group_exclusions (brand_id, category_id, modifier_group_id, product_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002')$$, '23503', null, 'rejects an exclusion for a product from another category');
select extensions.throws_ok($$insert into public.modifier_conditions (brand_id, parent_modifier_group_id, activating_modifier_option_id, child_modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')$$, '23503', null, 'rejects an activating option outside the parent group');
select extensions.throws_ok($$insert into public.modifier_conditions (brand_id, parent_modifier_group_id, activating_modifier_option_id, child_modifier_group_id) values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001')$$, '23514', null, 'rejects a direct modifier group self-reference');
select extensions.throws_ok($$insert into public.location_products (brand_id, location_id, product_id) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003')$$, '23503', null, 'rejects product availability across brands');
select extensions.throws_ok($$insert into public.location_modifier_options (brand_id, location_id, modifier_option_id) values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004')$$, '23503', null, 'rejects option availability across brands');

select * from extensions.finish();

rollback;

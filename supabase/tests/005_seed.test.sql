begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(27);

grant usage on schema extensions to anon;
grant execute on function extensions."is"(anyelement, anyelement, text) to anon;

select extensions.is((select count(*) from public.brands where id::text like '00000000-0000-4000-8000-%'), 2::bigint, 'seed contains two deterministic brands');
select extensions.is((select name from public.brands where slug = 'bbqbros'), 'BBQBROS'::text, 'seed identifies the active launch brand');
select extensions.is((select count(*) from public.brands where slug = 'marca-demo-inactiva' and not is_active), 1::bigint, 'seed includes one fictitious inactive brand');
select extensions.is((select count(*) from public.locations where brand_id = '00000000-0000-4000-8000-000000000001' and is_active), 2::bigint, 'BBQBROS seed has two active synthetic locations');
select extensions.is((select count(*) from public.categories where brand_id = '00000000-0000-4000-8000-000000000001'), 2::bigint, 'BBQBROS seed has two categories');
select extensions.is((select count(*) from public.categories where brand_id = '00000000-0000-4000-8000-000000000001' and not is_active), 1::bigint, 'one seeded category is inactive');
select extensions.is((select count(*) from public.products where brand_id = '00000000-0000-4000-8000-000000000001'), 4::bigint, 'BBQBROS seed has four products');
select extensions.is((select offer_price_cents from public.products where id = '30000000-0000-4000-8000-000000000002'), 6990::bigint, 'seed includes a valid offer price');
select extensions.is((select count(*) from public.products where brand_id = '00000000-0000-4000-8000-000000000001' and not is_active), 1::bigint, 'seed includes one inactive product');
select extensions.is((select count(*) from public.modifier_groups where brand_id = '00000000-0000-4000-8000-000000000001'), 3::bigint, 'seed has three reusable modifier groups');
select extensions.is((select array_agg(distinct selection_type order by selection_type) from public.modifier_groups where brand_id = '00000000-0000-4000-8000-000000000001'), array['multiple', 'single']::text[], 'seed covers single and multiple selection groups');
select extensions.ok(exists (select 1 from public.modifier_options where brand_id = '00000000-0000-4000-8000-000000000001' and price_adjustment_cents > 0), 'seed includes a positive modifier adjustment');
select extensions.ok(exists (select 1 from public.modifier_options where brand_id = '00000000-0000-4000-8000-000000000001' and price_adjustment_cents = 0), 'seed includes a zero modifier adjustment');
select extensions.ok(exists (select 1 from public.modifier_options where brand_id = '00000000-0000-4000-8000-000000000001' and price_adjustment_cents < 0), 'seed includes a negative modifier adjustment');
select extensions.is((select count(*) from public.category_modifier_groups where brand_id = '00000000-0000-4000-8000-000000000001'), 3::bigint, 'seed includes inherited modifier assignments');
select extensions.is((select count(*) from public.category_modifier_group_exclusions where brand_id = '00000000-0000-4000-8000-000000000001'), 1::bigint, 'seed includes one inherited modifier exclusion');
select extensions.is((select count(*) from public.product_modifier_groups where brand_id = '00000000-0000-4000-8000-000000000001'), 1::bigint, 'seed includes one direct modifier assignment');
select extensions.is((select count(*) from public.modifier_conditions where brand_id = '00000000-0000-4000-8000-000000000001'), 1::bigint, 'seed includes one valid modifier condition');
select extensions.is((select count(*) from public.location_products where brand_id = '00000000-0000-4000-8000-000000000001' and is_available), 3::bigint, 'seed includes three available location products');
select extensions.is((select count(*) from public.location_products where brand_id = '00000000-0000-4000-8000-000000000001' and not is_available), 5::bigint, 'seed includes five explicit unavailable location products');
select extensions.is((select count(*) from public.location_modifier_options where brand_id = '00000000-0000-4000-8000-000000000001' and is_available), 9::bigint, 'seed includes nine available location options');
select extensions.is((select count(*) from public.location_modifier_options where brand_id = '00000000-0000-4000-8000-000000000001' and not is_available), 3::bigint, 'seed includes three explicit unavailable location options');

set local role anon;

select extensions.is((select array_agg(slug order by slug) from public.brands where id::text like '00000000-0000-4000-8000-%'), array['bbqbros']::text[], 'anon sees only the active seeded brand');
select extensions.is((select count(*) from public.locations where brand_id = '00000000-0000-4000-8000-000000000001'), 2::bigint, 'anon sees both active seeded locations');
select extensions.is((select count(*) from public.categories where brand_id = '00000000-0000-4000-8000-000000000001'), 1::bigint, 'anon sees only the active seeded category');
select extensions.is((select count(*) from public.products where brand_id = '00000000-0000-4000-8000-000000000001'), 2::bigint, 'anon sees only active products with active parents');
select extensions.is((select count(*) from public.location_products where brand_id = '00000000-0000-4000-8000-000000000001'), 3::bigint, 'anon sees only true seeded product availability');

reset role;

select * from extensions.finish();

rollback;

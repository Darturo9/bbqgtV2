begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(29);

select extensions.lives_ok($$
  insert into public.brands (id, name, slug) values
    ('10000000-0000-4000-8000-000000000001', 'Marca Uno', 'marca-uno'),
    ('10000000-0000-4000-8000-000000000002', 'Marca Dos', 'marca-dos')
$$, 'accepts valid brands');

select extensions.lives_ok($$
  insert into public.locations (id, brand_id, name, slug)
  values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Zona 1', 'zona-1')
$$, 'accepts a valid location');

select extensions.lives_ok($$
  insert into public.categories (id, brand_id, name, slug) values
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Combos', 'combos'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Combos', 'combos')
$$, 'allows the same category slug in different brands');

select extensions.lives_ok($$
  insert into public.products (id, brand_id, category_id, name, slug, regular_price_cents, offer_price_cents)
  values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Combo Uno', 'combo-uno', 7500, 6500)
$$, 'accepts valid regular and offer prices');

select extensions.lives_ok($$
  insert into public.modifier_groups (id, brand_id, name, selection_type, min_selections, max_selections) values
    ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Tamaño', 'single', 1, 1),
    ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Salsas', 'multiple', 0, 3)
$$, 'accepts valid modifier groups');

select extensions.lives_ok($$
  insert into public.modifier_options (brand_id, modifier_group_id, name, price_adjustment_cents) values
    ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Grande', 1000),
    ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Mediano', 0),
    ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Sin acompañamiento', -500)
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

select * from extensions.finish();

rollback;

grant usage on schema public to anon, authenticated;

revoke all on table
  public.brands,
  public.locations,
  public.categories,
  public.products,
  public.modifier_groups,
  public.modifier_options,
  public.category_modifier_groups,
  public.category_modifier_group_exclusions,
  public.product_modifier_groups,
  public.modifier_conditions,
  public.location_products,
  public.location_modifier_options
from anon, authenticated;

grant select on table
  public.brands,
  public.locations,
  public.categories,
  public.products,
  public.modifier_groups,
  public.modifier_options,
  public.category_modifier_groups,
  public.category_modifier_group_exclusions,
  public.product_modifier_groups,
  public.modifier_conditions,
  public.location_products,
  public.location_modifier_options
to anon, authenticated;

create policy brands_public_select
on public.brands
for select
to anon, authenticated
using (is_active);

create policy locations_public_select
on public.locations
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.brands
    where brands.id = locations.brand_id
  )
);

create policy categories_public_select
on public.categories
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.brands
    where brands.id = categories.brand_id
  )
);

create policy products_public_select
on public.products
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.categories
    where categories.brand_id = products.brand_id
      and categories.id = products.category_id
  )
);

create policy modifier_groups_public_select
on public.modifier_groups
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.brands
    where brands.id = modifier_groups.brand_id
  )
);

create policy modifier_options_public_select
on public.modifier_options
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.modifier_groups
    where modifier_groups.brand_id = modifier_options.brand_id
      and modifier_groups.id = modifier_options.modifier_group_id
  )
);

create policy category_modifier_groups_public_select
on public.category_modifier_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.categories
    where categories.brand_id = category_modifier_groups.brand_id
      and categories.id = category_modifier_groups.category_id
  )
  and exists (
    select 1
    from public.modifier_groups
    where modifier_groups.brand_id = category_modifier_groups.brand_id
      and modifier_groups.id = category_modifier_groups.modifier_group_id
  )
);

create policy category_modifier_group_exclusions_public_select
on public.category_modifier_group_exclusions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.category_modifier_groups
    where category_modifier_groups.brand_id = category_modifier_group_exclusions.brand_id
      and category_modifier_groups.category_id = category_modifier_group_exclusions.category_id
      and category_modifier_groups.modifier_group_id = category_modifier_group_exclusions.modifier_group_id
  )
  and exists (
    select 1
    from public.products
    where products.brand_id = category_modifier_group_exclusions.brand_id
      and products.category_id = category_modifier_group_exclusions.category_id
      and products.id = category_modifier_group_exclusions.product_id
  )
);

create policy product_modifier_groups_public_select
on public.product_modifier_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.brand_id = product_modifier_groups.brand_id
      and products.id = product_modifier_groups.product_id
  )
  and exists (
    select 1
    from public.modifier_groups
    where modifier_groups.brand_id = product_modifier_groups.brand_id
      and modifier_groups.id = product_modifier_groups.modifier_group_id
  )
);

create policy modifier_conditions_public_select
on public.modifier_conditions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.modifier_options
    where modifier_options.brand_id = modifier_conditions.brand_id
      and modifier_options.modifier_group_id = modifier_conditions.parent_modifier_group_id
      and modifier_options.id = modifier_conditions.activating_modifier_option_id
  )
  and exists (
    select 1
    from public.modifier_groups
    where modifier_groups.brand_id = modifier_conditions.brand_id
      and modifier_groups.id = modifier_conditions.child_modifier_group_id
  )
);

create policy location_products_public_select
on public.location_products
for select
to anon, authenticated
using (
  is_available
  and exists (
    select 1
    from public.locations
    where locations.brand_id = location_products.brand_id
      and locations.id = location_products.location_id
  )
  and exists (
    select 1
    from public.products
    where products.brand_id = location_products.brand_id
      and products.id = location_products.product_id
  )
);

create policy location_modifier_options_public_select
on public.location_modifier_options
for select
to anon, authenticated
using (
  is_available
  and exists (
    select 1
    from public.locations
    where locations.brand_id = location_modifier_options.brand_id
      and locations.id = location_modifier_options.location_id
  )
  and exists (
    select 1
    from public.modifier_options
    where modifier_options.brand_id = location_modifier_options.brand_id
      and modifier_options.id = location_modifier_options.modifier_option_id
  )
);

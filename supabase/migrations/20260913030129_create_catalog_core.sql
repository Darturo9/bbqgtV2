create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  currency_code text not null default 'GTQ',
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint brands_name_not_blank check (btrim(name) <> ''),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint brands_currency_gtq check (currency_code = 'GTQ'),
  constraint brands_slug_key unique (slug)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint locations_name_not_blank check (btrim(name) <> ''),
  constraint locations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict,
  constraint locations_brand_id_id_key unique (brand_id, id),
  constraint locations_brand_id_slug_key unique (brand_id, slug)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_description_not_blank check (description is null or btrim(description) <> ''),
  constraint categories_display_order_nonnegative check (display_order >= 0),
  constraint categories_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict,
  constraint categories_brand_id_id_key unique (brand_id, id),
  constraint categories_brand_id_slug_key unique (brand_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  category_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  regular_price_cents bigint not null,
  offer_price_cents bigint,
  image_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_description_not_blank check (description is null or btrim(description) <> ''),
  constraint products_regular_price_positive check (regular_price_cents > 0),
  constraint products_offer_price_positive check (offer_price_cents is null or offer_price_cents > 0),
  constraint products_offer_below_regular check (offer_price_cents is null or offer_price_cents < regular_price_cents),
  constraint products_image_path_relative check (
    image_path is null
    or (btrim(image_path) <> '' and image_path = btrim(image_path) and image_path !~ '^(https?://|/)')
  ),
  constraint products_display_order_nonnegative check (display_order >= 0),
  constraint products_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict,
  constraint products_brand_id_category_id_fkey foreign key (brand_id, category_id) references public.categories (brand_id, id) on delete restrict,
  constraint products_brand_id_id_key unique (brand_id, id),
  constraint products_brand_id_category_id_id_key unique (brand_id, category_id, id),
  constraint products_brand_id_slug_key unique (brand_id, slug)
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  name text not null,
  description text,
  selection_type text not null,
  min_selections integer not null default 0,
  max_selections integer not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint modifier_groups_name_not_blank check (btrim(name) <> ''),
  constraint modifier_groups_description_not_blank check (description is null or btrim(description) <> ''),
  constraint modifier_groups_selection_type_valid check (selection_type in ('single', 'multiple')),
  constraint modifier_groups_min_nonnegative check (min_selections >= 0),
  constraint modifier_groups_max_positive check (max_selections >= 1),
  constraint modifier_groups_range_valid check (min_selections <= max_selections),
  constraint modifier_groups_single_range_valid check (
    selection_type <> 'single' or (min_selections in (0, 1) and max_selections = 1)
  ),
  constraint modifier_groups_display_order_nonnegative check (display_order >= 0),
  constraint modifier_groups_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict,
  constraint modifier_groups_brand_id_id_key unique (brand_id, id)
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  modifier_group_id uuid not null,
  name text not null,
  description text,
  price_adjustment_cents bigint not null default 0,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint modifier_options_name_not_blank check (btrim(name) <> ''),
  constraint modifier_options_description_not_blank check (description is null or btrim(description) <> ''),
  constraint modifier_options_display_order_nonnegative check (display_order >= 0),
  constraint modifier_options_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict,
  constraint modifier_options_brand_id_group_id_fkey foreign key (brand_id, modifier_group_id) references public.modifier_groups (brand_id, id) on delete restrict,
  constraint modifier_options_brand_id_id_key unique (brand_id, id),
  constraint modifier_options_brand_id_group_id_id_key unique (brand_id, modifier_group_id, id)
);

create index categories_catalog_order_idx
on public.categories (brand_id, is_active, display_order);

create index products_catalog_order_idx
on public.products (brand_id, category_id, is_active, display_order);

create index modifier_groups_catalog_order_idx
on public.modifier_groups (brand_id, is_active, display_order);

create index modifier_options_catalog_order_idx
on public.modifier_options (brand_id, modifier_group_id, is_active, display_order);

alter table public.brands enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;

revoke all on table
  public.brands,
  public.locations,
  public.categories,
  public.products,
  public.modifier_groups,
  public.modifier_options
from public, anon, authenticated;

create trigger set_updated_at
before update on public.brands
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.locations
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.modifier_groups
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.modifier_options
for each row execute function private.set_updated_at();

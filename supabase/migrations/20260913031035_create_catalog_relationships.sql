create table public.category_modifier_groups (
  brand_id uuid not null,
  category_id uuid not null,
  modifier_group_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint category_modifier_groups_pkey primary key (brand_id, category_id, modifier_group_id),
  constraint category_modifier_groups_category_fkey
    foreign key (brand_id, category_id)
    references public.categories (brand_id, id)
    on delete restrict,
  constraint category_modifier_groups_group_fkey
    foreign key (brand_id, modifier_group_id)
    references public.modifier_groups (brand_id, id)
    on delete restrict
);

create table public.category_modifier_group_exclusions (
  brand_id uuid not null,
  category_id uuid not null,
  modifier_group_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint category_modifier_group_exclusions_pkey
    primary key (brand_id, category_id, modifier_group_id, product_id),
  constraint category_modifier_group_exclusions_assignment_fkey
    foreign key (brand_id, category_id, modifier_group_id)
    references public.category_modifier_groups (brand_id, category_id, modifier_group_id)
    on delete restrict,
  constraint category_modifier_group_exclusions_product_fkey
    foreign key (brand_id, category_id, product_id)
    references public.products (brand_id, category_id, id)
    on delete restrict
);

create table public.product_modifier_groups (
  brand_id uuid not null,
  product_id uuid not null,
  modifier_group_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint product_modifier_groups_pkey primary key (brand_id, product_id, modifier_group_id),
  constraint product_modifier_groups_product_fkey
    foreign key (brand_id, product_id)
    references public.products (brand_id, id)
    on delete restrict,
  constraint product_modifier_groups_group_fkey
    foreign key (brand_id, modifier_group_id)
    references public.modifier_groups (brand_id, id)
    on delete restrict
);

create table public.modifier_conditions (
  brand_id uuid not null,
  parent_modifier_group_id uuid not null,
  activating_modifier_option_id uuid not null,
  child_modifier_group_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint modifier_conditions_pkey
    primary key (
      brand_id,
      parent_modifier_group_id,
      activating_modifier_option_id,
      child_modifier_group_id
    ),
  constraint modifier_conditions_distinct_groups
    check (parent_modifier_group_id <> child_modifier_group_id),
  constraint modifier_conditions_activating_option_fkey
    foreign key (brand_id, parent_modifier_group_id, activating_modifier_option_id)
    references public.modifier_options (brand_id, modifier_group_id, id)
    on delete restrict,
  constraint modifier_conditions_child_group_fkey
    foreign key (brand_id, child_modifier_group_id)
    references public.modifier_groups (brand_id, id)
    on delete restrict
);

create table public.location_products (
  brand_id uuid not null,
  location_id uuid not null,
  product_id uuid not null,
  is_available boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint location_products_pkey primary key (brand_id, location_id, product_id),
  constraint location_products_location_fkey
    foreign key (brand_id, location_id)
    references public.locations (brand_id, id)
    on delete restrict,
  constraint location_products_product_fkey
    foreign key (brand_id, product_id)
    references public.products (brand_id, id)
    on delete restrict
);

create table public.location_modifier_options (
  brand_id uuid not null,
  location_id uuid not null,
  modifier_option_id uuid not null,
  is_available boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint location_modifier_options_pkey primary key (brand_id, location_id, modifier_option_id),
  constraint location_modifier_options_location_fkey
    foreign key (brand_id, location_id)
    references public.locations (brand_id, id)
    on delete restrict,
  constraint location_modifier_options_option_fkey
    foreign key (brand_id, modifier_option_id)
    references public.modifier_options (brand_id, id)
    on delete restrict
);

create index category_modifier_groups_group_idx
on public.category_modifier_groups (brand_id, modifier_group_id);

create index category_modifier_group_exclusions_product_idx
on public.category_modifier_group_exclusions (brand_id, category_id, product_id);

create index product_modifier_groups_group_idx
on public.product_modifier_groups (brand_id, modifier_group_id);

create index modifier_conditions_child_group_idx
on public.modifier_conditions (brand_id, child_modifier_group_id);

create index location_products_catalog_idx
on public.location_products (brand_id, location_id, is_available, product_id);

create index location_products_product_idx
on public.location_products (brand_id, product_id);

create index location_modifier_options_catalog_idx
on public.location_modifier_options (brand_id, location_id, is_available, modifier_option_id);

create index location_modifier_options_option_idx
on public.location_modifier_options (brand_id, modifier_option_id);

alter table public.category_modifier_groups enable row level security;
alter table public.category_modifier_group_exclusions enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.modifier_conditions enable row level security;
alter table public.location_products enable row level security;
alter table public.location_modifier_options enable row level security;

revoke all on table
  public.category_modifier_groups,
  public.category_modifier_group_exclusions,
  public.product_modifier_groups,
  public.modifier_conditions,
  public.location_products,
  public.location_modifier_options
from public, anon, authenticated;

create trigger set_updated_at
before update on public.category_modifier_groups
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.category_modifier_group_exclusions
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.product_modifier_groups
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.modifier_conditions
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.location_products
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.location_modifier_options
for each row execute function private.set_updated_at();

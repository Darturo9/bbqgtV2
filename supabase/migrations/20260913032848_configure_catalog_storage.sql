insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalog',
  'catalog',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
);

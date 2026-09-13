begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

grant usage on schema extensions to anon, authenticated;
grant execute on function extensions."is"(anyelement, anyelement, text) to anon, authenticated;
grant execute on function extensions.is_empty(text, text) to anon, authenticated;
grant execute on function extensions.throws_ok(text, character, text, text) to anon, authenticated;

select extensions.is(
  (select count(*) from storage.buckets where id = 'catalog'),
  1::bigint,
  'catalog bucket exists exactly once'
);
select extensions.is(
  (select name from storage.buckets where id = 'catalog'),
  'catalog'::text,
  'catalog bucket name matches its stable identifier'
);
select extensions.is(
  (select public from storage.buckets where id = 'catalog'),
  true,
  'catalog bucket is public'
);
select extensions.is(
  (select file_size_limit from storage.buckets where id = 'catalog'),
  2097152::bigint,
  'catalog bucket limits files to 2 MiB'
);
select extensions.is(
  (
    select array_agg(mime_type order by mime_type)
    from storage.buckets
    cross join lateral unnest(allowed_mime_types) as mime_type
    where id = 'catalog'
  ),
  array['image/avif', 'image/jpeg', 'image/png', 'image/webp']::text[],
  'catalog bucket accepts only approved image MIME types'
);
select extensions.is(
  (select type::text from storage.buckets where id = 'catalog'),
  'STANDARD'::text,
  'catalog uses the standard storage bucket type'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage.objects keeps RLS enabled'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'b0000000-0000-4000-8000-000000000001',
  'catalog',
  'bbqbros/products/security-fixture.webp',
  null
);

set local role anon;

select extensions.throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('catalog', 'bbqbros/products/anon.webp')$$,
  '42501',
  null,
  'anon cannot upload catalog objects'
);
select extensions.is_empty(
  $$
    update storage.objects
    set name = 'bbqbros/products/changed-by-anon.webp'
    where id = 'b0000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'anon cannot update catalog objects'
);
select extensions.throws_ok(
  $$delete from storage.objects where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'anon cannot delete catalog objects'
);

reset role;
set local role authenticated;

select extensions.throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('catalog', 'bbqbros/products/authenticated.webp')$$,
  '42501',
  null,
  'authenticated cannot upload catalog objects'
);
select extensions.is_empty(
  $$
    update storage.objects
    set name = 'bbqbros/products/changed-by-authenticated.webp'
    where id = 'b0000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'authenticated cannot update catalog objects'
);
select extensions.throws_ok(
  $$delete from storage.objects where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'authenticated cannot delete catalog objects'
);

reset role;

select extensions.is(
  (select name from storage.objects where id = 'b0000000-0000-4000-8000-000000000001'),
  'bbqbros/products/security-fixture.webp'::text,
  'blocked client writes leave the catalog object unchanged'
);

select * from extensions.finish();

rollback;

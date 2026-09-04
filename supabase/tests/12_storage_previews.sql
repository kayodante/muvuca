-- Storage bucket `link-previews`: private bucket, 4 owner-prefix policies
-- on storage.objects (0023_link_previews.sql). Fixtures are inserted as
-- the postgres role (superuser, bypasses RLS) to simulate objects already
-- uploaded by A -- exactly like 01_ownership_rls.sql seeds table fixtures
-- while authenticated as A, except here we never even need to authenticate
-- for the insert since postgres bypasses RLS by default.
--
-- Deletion is intentionally not exercised here: storage.objects carries a
-- statement-level BEFORE DELETE trigger (`storage.protect_delete()`) that
-- rejects direct deletes regardless of RLS unless
-- `storage.allow_delete_query` is set, which is a Storage-API-only
-- escape hatch this suite has no reason to flip. The brief's required
-- storage assertions (policies exist, cross-user select/insert denial,
-- bucket not public) don't need it.

begin;

select plan(7);

select ok(
  not (select public from storage.buckets where id = 'link-previews'),
  'link-previews bucket is not public'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'link-previews'),
  array['image/webp'],
  'link-previews bucket only accepts image/webp'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'link_previews_objects_select',
        'link_previews_objects_insert',
        'link_previews_objects_update',
        'link_previews_objects_delete'
      )),
  4,
  'all four link_previews policies exist on storage.objects'
);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('storage-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('storage-b@muvuca.test')));

with new_item as (
  select gen_random_uuid() as id
)
insert into fixture_ids select 'item_a', id from new_item;

-- Seed as postgres (superuser, bypasses RLS): an object already uploaded
-- by A under her own prefix.
insert into storage.objects (bucket_id, name, owner)
values (
  'link-previews',
  (select id from fixture_ids where label = 'user_a')::text || '/' ||
    (select id from fixture_ids where label = 'item_a')::text || '/t_' ||
    repeat('a', 64) || '.webp',
  (select id from fixture_ids where label = 'user_a')
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'link-previews'
      and name like (select id from fixture_ids where label = 'user_a')::text || '/%'),
  0,
  'B cannot select an object under A''s prefix via RLS'
);

select throws_ok(
  format(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('link-previews', %L, %L)$sql$,
    (select id from fixture_ids where label = 'user_a')::text || '/' ||
      (select id from fixture_ids where label = 'item_a')::text || '/t_' || repeat('b', 64) || '.webp',
    (select id from fixture_ids where label = 'user_b')
  ),
  '42501'::character(5),
  null::text,
  'B cannot insert an object under A''s prefix'
);

select lives_ok(
  format(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('link-previews', %L, %L)$sql$,
    (select id from fixture_ids where label = 'user_b')::text || '/' ||
      (select id from fixture_ids where label = 'item_a')::text || '/t_' || repeat('c', 64) || '.webp',
    (select id from fixture_ids where label = 'user_b')
  ),
  'B can insert an object under her own prefix'
);

select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'link-previews'
      and name like (select id from fixture_ids where label = 'user_b')::text || '/%'),
  1,
  'B can select the object she just inserted under her own prefix'
);

select * from finish();

rollback;

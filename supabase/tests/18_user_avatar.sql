-- Foto de perfil (0035_user_avatar.sql, ADR-017/AAA-244): bucket `avatars`
-- privado, 4 policies por prefixo em storage.objects, check do hash em
-- user_preferences, reset_account() zerando a foto. B não ler
-- `avatar_hash` de A em user_preferences já é coberto por
-- 09_user_preferences.sql (RLS da tabela); não duplicado aqui.
begin;

select plan(17);

select ok(
  not (select public from storage.buckets where id = 'avatars'),
  'avatars bucket is not public'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'avatars'),
  array['image/webp'],
  'avatars bucket only accepts image/webp'
);

select is(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  262144::bigint,
  'avatars bucket caps objects at 256 KiB'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'avatars_objects_select',
        'avatars_objects_insert',
        'avatars_objects_update',
        'avatars_objects_delete'
      )),
  4,
  'all four avatars_objects policies exist on storage.objects'
);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('avatar-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('avatar-b@muvuca.test')));

-- Seed as postgres (superuser, bypasses RLS): an object already uploaded
-- by A under her own prefix -- same pattern as 12_storage_previews.sql.
insert into storage.objects (bucket_id, name, owner)
values (
  'avatars',
  (select id from fixture_ids where label = 'user_a')::text || '/' || repeat('a', 64) || '.webp',
  (select id from fixture_ids where label = 'user_a')
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'avatars'
      and name like (select id from fixture_ids where label = 'user_a')::text || '/%'),
  0,
  'B cannot select A''s avatar object via RLS'
);

select throws_ok(
  format(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L)$sql$,
    (select id from fixture_ids where label = 'user_a')::text || '/' || repeat('b', 64) || '.webp',
    (select id from fixture_ids where label = 'user_b')
  ),
  '42501'::character(5),
  null::text,
  'B cannot insert an object under A''s prefix'
);

-- storage.objects carries a statement-level BEFORE DELETE trigger
-- (protect_objects_delete -> storage.protect_delete()) that raises 42501
-- for ANY direct delete unless storage.allow_delete_query is set -- before
-- RLS ever filters a row. Without lifting it here, an update/delete test
-- would prove the trigger, not the policy. `set local` scopes the escape
-- hatch to this transaction only, so RLS is what's left to prove.
set local storage.allow_delete_query = 'true';

with upd as (
  update storage.objects set owner = (select id from fixture_ids where label = 'user_b')
  where bucket_id = 'avatars'
    and name = (select id from fixture_ids where label = 'user_a')::text || '/' || repeat('a', 64) || '.webp'
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s avatar object via RLS'
);

with del as (
  delete from storage.objects
  where bucket_id = 'avatars'
    and name = (select id from fixture_ids where label = 'user_a')::text || '/' || repeat('a', 64) || '.webp'
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s avatar object via RLS'
);

select lives_ok(
  format(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L)$sql$,
    (select id from fixture_ids where label = 'user_b')::text || '/' || repeat('c', 64) || '.webp',
    (select id from fixture_ids where label = 'user_b')
  ),
  'B can insert an object under her own prefix'
);

select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'avatars'
      and name like (select id from fixture_ids where label = 'user_b')::text || '/%'),
  1,
  'B can select the object she just inserted under her own prefix'
);

-- Check constraint on user_preferences.avatar_hash, as A on her own row.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

insert into public.user_preferences (user_id, avatar_hash)
values ((select auth.uid()), repeat('a', 64));

select is(
  (select avatar_hash from public.user_preferences where user_id = (select auth.uid())),
  repeat('a', 64),
  'A can save a valid 64 lowercase hex avatar_hash'
);

select lives_ok(
  $$update public.user_preferences set avatar_hash = null where user_id = (select auth.uid())$$,
  'avatar_hash can be cleared back to null'
);

select throws_ok(
  format(
    $sql$update public.user_preferences set avatar_hash = %L where user_id = (select auth.uid())$sql$,
    repeat('A', 64)
  ),
  '23514'::character(5),
  null::text,
  'uppercase hex avatar_hash is rejected'
);

select throws_ok(
  format(
    $sql$update public.user_preferences set avatar_hash = %L where user_id = (select auth.uid())$sql$,
    repeat('a', 63)
  ),
  '23514'::character(5),
  null::text,
  '63-character avatar_hash is rejected'
);

select throws_ok(
  format(
    $sql$update public.user_preferences set avatar_hash = %L where user_id = (select auth.uid())$sql$,
    '../' || repeat('a', 61)
  ),
  '23514'::character(5),
  null::text,
  'path-traversal-shaped avatar_hash is rejected'
);

-- reset_account() (0020_reset_account.sql) wipes the whole preferences row.
select lives_ok(
  $$update public.user_preferences set avatar_hash = repeat('a', 64) where user_id = (select auth.uid())$$,
  'A can set avatar_hash again ahead of the reset assertion'
);

select public.reset_account();

select is(
  (select count(*)::int from public.user_preferences where avatar_hash is not null),
  0,
  'reset_account() clears avatar_hash along with the rest of the preference row'
);

select * from finish();

rollback;

-- Cross-user ownership: 12 negative assertions (select/insert/update/delete
-- x tags/library_items/item_tags) proving user B can never read, create,
-- modify, or delete user A's rows.
--
-- Fixtures are created as the postgres role, which is a superuser and so
-- bypasses RLS by default even though `force row level security` is set on
-- every table. The transaction is rolled back at the end, so no fixture
-- data (including the auth.users rows) survives the test run.
--
-- Postgres requires a data-modifying CTE to sit at the top level of a
-- statement, not nested inside a scalar subquery -- so each update/delete
-- assertion below is written as `with upd as (update ... returning 1)
-- select is(...)` rather than nesting the CTE inside is()'s argument list.
--
-- throws_ok's 3-argument form treats a 5-byte 2nd argument as a SQLSTATE
-- and then matches the 3rd argument against the exact exception message
-- (not a free-text label), so the insert-ownership assertions use the
-- unambiguous 4-argument base signature with explicit casts instead:
-- `'code'::character(5), null::text, description`. A bare `::character`
-- cast (no length) truncates to a single character in Postgres, so the
-- length must be explicit.

begin;

select plan(12);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('owner-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('owner-b@muvuca.test')));

-- Seed A's data while authenticated as A.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with new_tag as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'A Root Tag', 'lime')
  returning id
)
insert into fixture_ids select 'tag_a', id from new_tag;

-- A second, unrelated tag of A's, deliberately never linked to item_a: the
-- last assertion below needs an (item_id, tag_id) pair with no existing
-- item_tags row, so the FK violation it is checking for isn't masked by a
-- primary-key collision on the (item_a, tag_a) pair seeded above.
with new_tag2 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'A Second Tag', 'blue')
  returning id
)
insert into fixture_ids select 'tag_a2', id from new_tag2;

with new_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'A Item', 'https://a.example/page', 'https://a.example/page')
  returning id
)
insert into fixture_ids select 'item_a', id from new_item;

with new_link as (
  insert into public.item_tags (user_id, item_id, tag_id)
  values (
    (select auth.uid()),
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_a')
  )
  returning item_id
)
insert into fixture_ids select 'item_tag_a', item_id from new_link;

-- Switch to B and attempt every operation against A's rows.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

-- tags: select
select is(
  (select count(*)::int from public.tags where id = (select id from fixture_ids where label = 'tag_a')),
  0,
  'B cannot select A''s tag via RLS'
);

-- tags: update (0 rows affected, not an error -- USING filters it out first)
with upd as (
  update public.tags set name = 'hacked-by-b'
  where id = (select id from fixture_ids where label = 'tag_a')
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s tag via RLS'
);

-- tags: delete (0 rows affected)
with del as (
  delete from public.tags
  where id = (select id from fixture_ids where label = 'tag_a')
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s tag via RLS'
);

-- tags: insert claiming A's user_id
select throws_ok(
  format(
    $sql$insert into public.tags (user_id, name, color_token) values (%L, 'evil', 'lime')$sql$,
    (select id from fixture_ids where label = 'user_a')
  ),
  '42501'::character(5),
  null::text,
  'B cannot insert a tag claiming A''s ownership'
);

-- library_items: select
select is(
  (select count(*)::int from public.library_items where id = (select id from fixture_ids where label = 'item_a')),
  0,
  'B cannot select A''s item via RLS'
);

-- library_items: update
with upd as (
  update public.library_items set title = 'hacked-by-b'
  where id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s item via RLS'
);

-- library_items: delete
with del as (
  delete from public.library_items
  where id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s item via RLS'
);

-- library_items: insert claiming A's user_id
select throws_ok(
  format(
    $sql$insert into public.library_items (user_id, type, title, url, normalized_url)
         values (%L, 'link', 'evil', 'https://evil.example', 'https://evil.example')$sql$,
    (select id from fixture_ids where label = 'user_a')
  ),
  '42501'::character(5),
  null::text,
  'B cannot insert an item claiming A''s ownership'
);

-- item_tags: select
select is(
  (select count(*)::int from public.item_tags where item_id = (select id from fixture_ids where label = 'item_a')),
  0,
  'B cannot select A''s item_tags row via RLS'
);

-- item_tags: update (only created_at is practically mutable; assert 0 rows regardless)
with upd as (
  update public.item_tags set created_at = now()
  where item_id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s item_tags row via RLS'
);

-- item_tags: delete
with del as (
  delete from public.item_tags
  where item_id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s item_tags row via RLS'
);

-- item_tags: insert claiming A's item/tag under B's own user_id. Uses
-- tag_a2, not tag_a, so this hits the FK violation it is meant to check
-- rather than the item_tags_pkey collision from the (item_a, tag_a) row
-- already seeded above.
select throws_ok(
  format(
    $sql$insert into public.item_tags (user_id, item_id, tag_id) values (%L, %L, %L)$sql$,
    (select id from fixture_ids where label = 'user_b'),
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_a2')
  ),
  '23503'::character(5),
  null::text,
  'B cannot associate own user_id with A''s item/tag (RLS check passes since user_id=B, composite FK to library_items/tags blocks it)'
);

select * from finish();

rollback;

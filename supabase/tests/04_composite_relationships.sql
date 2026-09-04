-- item_tags composite-FK ownership: associating an item from one user with
-- a tag from another is structurally impossible, because
-- both foreign keys are composite against (id, user_id) and share the same
-- user_id column on item_tags. This is checked independently of RLS -- both
-- attempts below use the acting user's own id as user_id, so the RLS WITH
-- CHECK passes; it is the FK that must block them.

begin;

select plan(3);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('composite-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('composite-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with item_a as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'A Item', 'https://a.example/composite', 'https://a.example/composite')
  returning id
)
insert into fixture_ids select 'item_a', id from item_a;

with tag_a as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'A Tag', 'lime')
  returning id
)
insert into fixture_ids select 'tag_a', id from tag_a;

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

with item_b as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'B Item', 'https://b.example/composite', 'https://b.example/composite')
  returning id
)
insert into fixture_ids select 'item_b', id from item_b;

with tag_b as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'B Tag', 'blue')
  returning id
)
insert into fixture_ids select 'tag_b', id from tag_b;

-- 1. As A: associate A's own item with B's tag. RLS WITH CHECK passes
--    (user_id = A = auth.uid()); the (tag_id, user_id) composite FK against
--    tags(id, user_id) fails because that tag's real owner is B.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select throws_ok(
  format(
    $sql$insert into public.item_tags (user_id, item_id, tag_id) values (auth.uid(), %L, %L)$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_b')
  ),
  '23503'::character(5),
  null::text,
  'A cannot tag A''s own item with B''s tag (tag/user composite FK blocks it)'
);

-- 2. As B: associate B's own tag with A's item. Same shape, opposite side
--    of the relationship (item_id, user_id) fails this time.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select throws_ok(
  format(
    $sql$insert into public.item_tags (user_id, item_id, tag_id) values (auth.uid(), %L, %L)$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_b')
  ),
  '23503'::character(5),
  null::text,
  'B cannot tag A''s item with B''s own tag (item/user composite FK blocks it)'
);

-- 3. Positive control: associating A's own item with A's own tag succeeds.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select lives_ok(
  format(
    $sql$insert into public.item_tags (user_id, item_id, tag_id) values (auth.uid(), %L, %L)$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_a')
  ),
  'associating an item with a tag from the same owner succeeds'
);

select * from finish();

rollback;

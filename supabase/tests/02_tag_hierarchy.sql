-- Tag hierarchy invariants: self-parent, cycle via
-- move-to-descendant, and max depth of 6 levels -- including the case where
-- depth is exceeded by a subtree move that is not itself a cycle. The
-- concurrent-race window that pg_advisory_xact_lock closes is not exercised
-- here -- pgTAP runs single-threaded within one transaction, so it cannot
-- reproduce two concurrent UPDATEs; that guarantee is structural (advisory
-- lock in 0008_tag_hierarchy.sql) rather than something this suite can
-- observe.

begin;

select plan(7);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('hierarchy-a@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 1. Self-parent at INSERT time (explicit id equal to parent_id) is rejected.
select throws_ok(
  $sql$
    insert into public.tags (id, user_id, parent_id, name, color_token)
    select v_id, auth.uid(), v_id, 'Self Parent', 'lime'
    from (select gen_random_uuid() as v_id) s
  $sql$,
  'a tag não pode ser pai de si mesma',
  'a tag cannot be inserted as its own parent'
);

-- Build a valid 6-level chain: level_1 (root) .. level_6.
with l1 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Level 1', 'lime') returning id
)
insert into fixture_ids select 'level_1', id from l1;

with l2 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'level_1'), 'Level 2', 'lime') returning id
)
insert into fixture_ids select 'level_2', id from l2;

with l3 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'level_2'), 'Level 3', 'lime') returning id
)
insert into fixture_ids select 'level_3', id from l3;

with l4 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'level_3'), 'Level 4', 'lime') returning id
)
insert into fixture_ids select 'level_4', id from l4;

with l5 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'level_4'), 'Level 5', 'lime') returning id
)
insert into fixture_ids select 'level_5', id from l5;

with l6 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'level_5'), 'Level 6', 'lime') returning id
)
insert into fixture_ids select 'level_6', id from l6;

-- 2. All six levels were created successfully (root = level 1).
select is(
  (select count(*)::int from fixture_ids where label like 'level_%'),
  6,
  'a 6-level tag chain (max allowed depth) can be created'
);

-- 3. A 7th level under level_6 is rejected.
select throws_ok(
  format(
    $sql$insert into public.tags (user_id, parent_id, name, color_token) values (%L, %L, 'Level 7', 'lime')$sql$,
    (select id from fixture_ids where label = 'user_a'),
    (select id from fixture_ids where label = 'level_6')
  ),
  'a hierarquia de tags excede a profundidade máxima de 6 níveis',
  'a 7th level tag is rejected by the depth trigger'
);

-- 4. Moving an ancestor two levels under its own descendant is rejected
--    (would create a cycle; ancestor-walk check).
select throws_ok(
  format(
    $sql$update public.tags set parent_id = %L where id = %L$sql$,
    (select id from fixture_ids where label = 'level_3'),
    (select id from fixture_ids where label = 'level_1')
  ),
  'esta alteração criaria um ciclo na hierarquia de tags',
  'moving level_1 under its own descendant level_3 is rejected'
);

-- 5. Moving an ancestor under its immediate child is likewise rejected
--    (same cycle check, one level closer).
select throws_ok(
  format(
    $sql$update public.tags set parent_id = %L where id = %L$sql$,
    (select id from fixture_ids where label = 'level_2'),
    (select id from fixture_ids where label = 'level_1')
  ),
  'esta alteração criaria um ciclo na hierarquia de tags',
  'moving level_1 under its own immediate child level_2 is rejected'
);

-- 6. A move that is NOT a cycle, but that would push an unrelated,
--    already-deep subtree past level 6, is rejected by the descendant-depth
--    check (as opposed to the ancestor-walk check exercised by #4 and #5).
--    other_root -> other_2 -> other_3 -> other_4 -> other_5 is a second,
--    unrelated chain at depth 5. Moving level_1 (which still carries its
--    five descendants level_2..level_6) under other_5 would place level_6
--    at depth 11.
with o1 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Other Root', 'emerald') returning id
)
insert into fixture_ids select 'other_1', id from o1;

with o2 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'other_1'), 'Other 2', 'emerald') returning id
)
insert into fixture_ids select 'other_2', id from o2;

with o3 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'other_2'), 'Other 3', 'emerald') returning id
)
insert into fixture_ids select 'other_3', id from o3;

with o4 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'other_3'), 'Other 4', 'emerald') returning id
)
insert into fixture_ids select 'other_4', id from o4;

with o5 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'other_4'), 'Other 5', 'emerald') returning id
)
insert into fixture_ids select 'other_5', id from o5;

select throws_ok(
  format(
    $sql$update public.tags set parent_id = %L where id = %L$sql$,
    (select id from fixture_ids where label = 'other_5'),
    (select id from fixture_ids where label = 'level_1')
  ),
  'esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes',
  'moving a subtree under an unrelated deep parent is rejected when it would push descendants past level 6'
);

-- 7. A valid move (positive control): move level_6 (a leaf, no descendants)
--    under other_1 (depth 1). Resulting depth is 2, well within the limit,
--    so this must succeed.
select lives_ok(
  format(
    $sql$update public.tags set parent_id = %L where id = %L$sql$,
    (select id from fixture_ids where label = 'other_1'),
    (select id from fixture_ids where label = 'level_6')
  ),
  'moving a leaf tag to a shallow, unrelated parent succeeds'
);

select * from finish();

rollback;

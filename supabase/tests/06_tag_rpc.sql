-- Tag RPCs (0009_tag_rpc.sql): delete_tag_reparent_children transactional
-- behavior, tag_descendants and tag_ancestors, and
-- that all three respect RLS -- a tag id belonging to another user behaves
-- as "not found", never as a distinguishable error or a visible row.

begin;

select plan(16);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('tagrpc-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('tagrpc-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- root -> mid -> leaf1, leaf2 (leaf1 and leaf2 are mid's direct children).
with root as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Root', 'lime') returning id
)
insert into fixture_ids select 'root', id from root;

with mid as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'root'), 'Mid', 'emerald') returning id
)
insert into fixture_ids select 'mid', id from mid;

with leaf1 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'mid'), 'Leaf 1', 'blue') returning id
)
insert into fixture_ids select 'leaf1', id from leaf1;

with leaf2 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'mid'), 'Leaf 2', 'blue') returning id
)
insert into fixture_ids select 'leaf2', id from leaf2;

with item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Item', 'https://a.example/tagrpc', 'https://a.example/tagrpc')
  returning id
)
insert into fixture_ids select 'item', id from item;

insert into public.item_tags (user_id, item_id, tag_id)
values (
  (select auth.uid()),
  (select id from fixture_ids where label = 'item'),
  (select id from fixture_ids where label = 'mid')
);

-- 1-2. Deleting 'mid' promotes leaf1/leaf2 to 'root' (mid's own parent).
select public.delete_tag_reparent_children((select id from fixture_ids where label = 'mid'));

select is(
  (select parent_id from public.tags where id = (select id from fixture_ids where label = 'leaf1')),
  (select id from fixture_ids where label = 'root'),
  'leaf1 is reparented to mid''s own parent (root) after mid is deleted'
);

select is(
  (select parent_id from public.tags where id = (select id from fixture_ids where label = 'leaf2')),
  (select id from fixture_ids where label = 'root'),
  'leaf2 is reparented to mid''s own parent (root) after mid is deleted'
);

-- 3. item_tags row for the deleted tag is gone.
select is(
  (select count(*)::int from public.item_tags where tag_id = (select id from fixture_ids where label = 'mid')),
  0,
  'item_tags rows for the deleted tag are removed'
);

-- 4. The item itself survives -- only the association was removed.
select is(
  (select count(*)::int from public.library_items where id = (select id from fixture_ids where label = 'item')),
  1,
  'the library item is not deleted when a tag it was associated with is deleted'
);

-- 5. Deleting a root tag promotes its (former) grandchildren, now direct
--    children, to root level (parent_id becomes null).
select public.delete_tag_reparent_children((select id from fixture_ids where label = 'root'));

select is(
  (select parent_id from public.tags where id = (select id from fixture_ids where label = 'leaf1')),
  null::uuid,
  'deleting a root tag promotes its former children to root level (null parent_id)'
);

-- 6. Cross-user: B cannot delete A's tag -- RLS makes it invisible to the
--    initial SELECT inside the function, which raises "not found" rather
--    than a distinguishable authorization error.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select throws_ok(
  format(
    $sql$select public.delete_tag_reparent_children(%L)$sql$,
    (select id from fixture_ids where label = 'leaf2')
  ),
  'tag não encontrada',
  'B cannot delete A''s tag; it is reported as not found rather than forbidden'
);

-- tag_descendants / tag_ancestors: build a fresh, unrelated tree as A.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with d_root as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'D Root', 'violet') returning id
)
insert into fixture_ids select 'd_root', id from d_root;

with d_mid as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'd_root'), 'D Mid', 'violet') returning id
)
insert into fixture_ids select 'd_mid', id from d_mid;

with d_leaf as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'd_mid'), 'D Leaf', 'violet') returning id
)
insert into fixture_ids select 'd_leaf', id from d_leaf;

-- 7. tag_descendants(d_root) returns exactly {d_mid, d_leaf}.
select set_eq(
  $sql$select * from public.tag_descendants((select id from fixture_ids where label = 'd_root'))$sql$,
  $sql$select id from fixture_ids where label in ('d_mid', 'd_leaf')$sql$,
  'tag_descendants returns every descendant across two levels, and nothing else'
);

-- 8. tag_ancestors(d_leaf) returns {d_mid at depth 1, d_root at depth 2}.
select set_eq(
  $sql$select id, depth from public.tag_ancestors((select id from fixture_ids where label = 'd_leaf'))$sql$,
  $sql$
    select (select id from fixture_ids where label = 'd_mid'), 1
    union all
    select (select id from fixture_ids where label = 'd_root'), 2
  $sql$,
  'tag_ancestors returns the full chain to root with correct hop-depth'
);

-- 9. A root tag has no ancestors.
select is(
  (select count(*)::int from public.tag_ancestors((select id from fixture_ids where label = 'd_root'))),
  0,
  'a root tag has no ancestors'
);

-- 10. B gets nothing back for A's tag id -- RLS filters the underlying
--    select, not a visible cross-user result.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.tag_descendants((select id from fixture_ids where label = 'd_root'))),
  0,
  'tag_descendants returns nothing for a tag id owned by another user'
);

-- 11-16: Tag reparenting name collision handling
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 11-12. Collision at root level: existing root tag 'ConflictRoot' and child 'ConflictRoot' under 'ParentDel1'
with c_root as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'ConflictRoot', 'emerald') returning id
)
insert into fixture_ids select 'c_root', id from c_root;

with p_del1 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'ParentDel1', 'emerald') returning id
)
insert into fixture_ids select 'p_del1', id from p_del1;

with c_child1 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'p_del1'), 'ConflictRoot', 'emerald') returning id
)
insert into fixture_ids select 'c_child1', id from c_child1;

select public.delete_tag_reparent_children((select id from fixture_ids where label = 'p_del1'));

select is(
  (select parent_id from public.tags where id = (select id from fixture_ids where label = 'c_child1')),
  null::uuid,
  'colliding child is reparented to root level'
);

select is(
  (select name from public.tags where id = (select id from fixture_ids where label = 'c_child1')),
  'ConflictRoot (1)',
  'colliding child tag is renamed to ConflictRoot (1) when ConflictRoot already exists at root'
);

-- 13. Chained collision at root level: promote another 'ConflictRoot' when both 'ConflictRoot' and 'ConflictRoot (1)' exist
with p_del2 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'ParentDel2', 'emerald') returning id
)
insert into fixture_ids select 'p_del2', id from p_del2;

with c_child2 as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'p_del2'), 'ConflictRoot', 'emerald') returning id
)
insert into fixture_ids select 'c_child2', id from c_child2;

select public.delete_tag_reparent_children((select id from fixture_ids where label = 'p_del2'));

select is(
  (select name from public.tags where id = (select id from fixture_ids where label = 'c_child2')),
  'ConflictRoot (2)',
  'subsequent colliding child tag is renamed to ConflictRoot (2)'
);

-- 14. Collision at subtag (mid) level
with t_parent as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'TargetParent', 'amber') returning id
)
insert into fixture_ids select 't_parent', id from t_parent;

with t_existing_child as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 't_parent'), 'SubConflict', 'amber') returning id
)
insert into fixture_ids select 't_existing_child', id from t_existing_child;

with t_mid_del as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 't_parent'), 'SubMidDel', 'amber') returning id
)
insert into fixture_ids select 't_mid_del', id from t_mid_del;

with t_mid_child as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 't_mid_del'), 'SubConflict', 'amber') returning id
)
insert into fixture_ids select 't_mid_child', id from t_mid_child;

select public.delete_tag_reparent_children((select id from fixture_ids where label = 't_mid_del'));

select is(
  (select name from public.tags where id = (select id from fixture_ids where label = 't_mid_child')),
  'SubConflict (1)',
  'colliding child tag at mid level is renamed to SubConflict (1) under target parent'
);

-- 15. Max length (80 chars) collision truncation
with max_root as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), repeat('x', 80), 'cyan') returning id
)
insert into fixture_ids select 'max_root', id from max_root;

with max_parent as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'MaxParent', 'cyan') returning id
)
insert into fixture_ids select 'max_parent', id from max_parent;

with max_child as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'max_parent'), repeat('x', 80), 'cyan') returning id
)
insert into fixture_ids select 'max_child', id from max_child;

select public.delete_tag_reparent_children((select id from fixture_ids where label = 'max_parent'));

select is(
  (select name from public.tags where id = (select id from fixture_ids where label = 'max_child')),
  repeat('x', 76) || ' (1)',
  '80-character name is safely truncated so suffixed name fits within 80 character limit'
);

-- 16. Cross-user isolation: User B having tag with same name does not trigger renaming for User A
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));
insert into public.tags (user_id, name, color_token)
values ((select auth.uid()), 'CrossUserDistinct', 'red');

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));
with u_parent as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'UserAParent', 'red') returning id
)
insert into fixture_ids select 'u_parent', id from u_parent;

with u_child as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'u_parent'), 'CrossUserDistinct', 'red') returning id
)
insert into fixture_ids select 'u_child', id from u_child;

select public.delete_tag_reparent_children((select id from fixture_ids where label = 'u_parent'));

select is(
  (select name from public.tags where id = (select id from fixture_ids where label = 'u_child')),
  'CrossUserDistinct',
  'User A child tag is not renamed when identical name belongs only to User B'
);

select * from finish();

rollback;

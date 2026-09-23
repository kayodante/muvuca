-- Bulk tag RPCs (0032_tag_bulk_ops.sql): move_tags and
-- delete_tags_reparent_children are atomic, normalize/ordering as specified,
-- and respect RLS -- another user's tag is "not found", never "forbidden".

begin;

select plan(23);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('bulk-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('bulk-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

create function pg_temp.add_tag(p_label text, p_name text, p_parent_label text)
returns void language sql as $$
  with created as (
    insert into public.tags (user_id, parent_id, name, color_token)
    values (
      (select auth.uid()),
      (select id from fixture_ids where label = p_parent_label),
      p_name,
      'lime'
    )
    returning id
  )
  insert into fixture_ids
  select p_label, id from created;
$$;

create function pg_temp.fid(p_label text)
returns uuid language sql stable as $$
  select id from fixture_ids where label = p_label;
$$;

create function pg_temp.parent_of(p_label text)
returns uuid language sql stable as $$
  select parent_id from public.tags where id = pg_temp.fid(p_label);
$$;

-- Alpha -> Mid -> Leaf ; Beta -> Mid(x) ; Dest ; D1 -> D2 -> D3 -> D4 -> D5
select pg_temp.add_tag('r1', 'Alpha', null);
select pg_temp.add_tag('m', 'Mid', 'r1');
select pg_temp.add_tag('l', 'Leaf', 'm');
select pg_temp.add_tag('r2', 'Beta', null);
select pg_temp.add_tag('x', 'Mid', 'r2');
select pg_temp.add_tag('dest', 'Dest', null);
select pg_temp.add_tag('d1', 'D1', null);
select pg_temp.add_tag('d2', 'D2', 'd1');
select pg_temp.add_tag('d3', 'D3', 'd2');
select pg_temp.add_tag('d4', 'D4', 'd3');
select pg_temp.add_tag('d5', 'D5', 'd4');

-- 1-2. Selecting a tag and its own child moves only the ancestor.
select public.move_tags(array[pg_temp.fid('m'), pg_temp.fid('l')], pg_temp.fid('dest'));
select is(pg_temp.parent_of('m'), pg_temp.fid('dest'), 'move_tags re-parents the selected ancestor');
select is(pg_temp.parent_of('l'), pg_temp.fid('m'), 'a selected descendant rides along and keeps its parent');

-- 3-4. Name collision at the destination rejects the batch (23505).
select throws_ok(
  format('select public.move_tags(array[%L]::uuid[], %L)', pg_temp.fid('m'), pg_temp.fid('r2')),
  '23505', null,
  'moving next to a sibling with the same name is rejected'
);
select is(pg_temp.parent_of('m'), pg_temp.fid('dest'), 'a rejected move leaves the tag where it was');

-- 5. Moving a tag under its own descendant is a cycle.
select throws_ok(
  format('select public.move_tags(array[%L]::uuid[], %L)', pg_temp.fid('dest'), pg_temp.fid('l')),
  'esta alteração criaria um ciclo na hierarquia de tags',
  'moving a tag under its own descendant is rejected'
);

-- 6-7. One bad tag rolls back the whole batch.
select throws_ok(
  format('select public.move_tags(array[%L, %L]::uuid[], %L)', pg_temp.fid('r1'), pg_temp.fid('dest'), pg_temp.fid('l')),
  'esta alteração criaria um ciclo na hierarquia de tags',
  'a batch containing one invalid move fails'
);
select is(pg_temp.parent_of('r1'), null::uuid, 'the valid half of a failed batch is not applied');

-- 8. Depth: Beta (height 2) under D5 (depth 5) would put Mid(x) at depth 7.
select throws_ok(
  format('select public.move_tags(array[%L]::uuid[], %L)', pg_temp.fid('r2'), pg_temp.fid('d5')),
  'esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes',
  'a move that pushes descendants past depth 6 is rejected'
);

-- 9. Omitted parent = root.
select public.move_tags(array[pg_temp.fid('m')]);
select is(pg_temp.parent_of('m'), null::uuid, 'move_tags without a parent makes the tags roots');

-- 10-11. Batch size bounds.
select throws_ok(
  'select public.move_tags(array[]::uuid[])',
  'lote de tags inválido',
  'an empty batch is rejected'
);
select throws_ok(
  'select public.move_tags((select array_agg(gen_random_uuid()) from generate_series(1, 501)))',
  'lote de tags inválido',
  'a batch over 500 ids is rejected'
);

-- Delete: Dest -> A -> B -> C, item on A. Deleting A and B leaves C under Dest.
select pg_temp.add_tag('a', 'A', 'dest');
select pg_temp.add_tag('b', 'B', 'a');
select pg_temp.add_tag('c', 'C', 'b');

with item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Bulk item', 'https://a.example/bulk', 'https://a.example/bulk')
  returning id
)
insert into fixture_ids select 'item', id from item;

insert into public.item_tags (user_id, item_id, tag_id)
values ((select auth.uid()), pg_temp.fid('item'), pg_temp.fid('a'));

select public.delete_tags_reparent_children(array[pg_temp.fid('a'), pg_temp.fid('b')]);

-- 12-14.
select is(
  (select count(*)::int from public.tags where id in (pg_temp.fid('a'), pg_temp.fid('b'))),
  0,
  'every selected tag is deleted, including a selected descendant'
);
select is(pg_temp.parent_of('c'), pg_temp.fid('dest'), 'an unselected grandchild ends under the nearest surviving ancestor');
select is(
  (select count(*)::int from public.library_items where id = pg_temp.fid('item')),
  1,
  'items are never deleted by a bulk tag delete'
);

-- 15.
select throws_ok(
  'select public.delete_tags_reparent_children(array[]::uuid[])',
  'lote de tags inválido',
  'an empty delete batch is rejected'
);

-- Cross-user: B owns BRoot -> BChild.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));
select pg_temp.add_tag('b_root', 'B Root', null);
select pg_temp.add_tag('b_child', 'B Child', 'b_root');

-- 16-20.
select throws_ok(
  format('select public.move_tags(array[%L]::uuid[])', pg_temp.fid('r1')),
  'tag não encontrada',
  'B cannot move A''s tag'
);
select throws_ok(
  format('select public.move_tags(array[%L]::uuid[], %L)', pg_temp.fid('b_child'), pg_temp.fid('r1')),
  'tag não encontrada',
  'B cannot move its own tag under A''s tag'
);
select throws_ok(
  format('select public.move_tags(array[%L, %L]::uuid[])', pg_temp.fid('b_child'), pg_temp.fid('r1')),
  'tag não encontrada',
  'a batch mixing B''s and A''s tags fails as a whole'
);
select is(pg_temp.parent_of('b_child'), pg_temp.fid('b_root'), 'B''s own tag in the failed mixed batch did not move');
select throws_ok(
  format('select public.delete_tags_reparent_children(array[%L]::uuid[])', pg_temp.fid('r1')),
  'tag não encontrada',
  'B cannot delete A''s tag'
);

-- 21.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));
select is(
  (select count(*)::int from public.tags where id = pg_temp.fid('r1')),
  1,
  'A''s tag survives B''s delete attempt'
);

-- 22-23. anon has no EXECUTE at all.
select ok(
  not has_function_privilege('anon', 'public.move_tags(uuid[], uuid)', 'EXECUTE'),
  'anon cannot execute move_tags'
);
select ok(
  not has_function_privilege('anon', 'public.delete_tags_reparent_children(uuid[])', 'EXECUTE'),
  'anon cannot execute delete_tags_reparent_children'
);

select * from finish();

rollback;

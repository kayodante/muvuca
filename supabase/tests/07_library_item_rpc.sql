-- Complete item mutation flow: atomic item/tag writes, tag
-- replacement/removal, cascade deletion, and cross-user denial.

begin;

select plan(16);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('itemrpc-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('itemrpc-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with tag_a as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'A One', 'lime') returning id
)
insert into fixture_ids select 'tag_a', id from tag_a;

with tag_a2 as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'A Two', 'blue') returning id
)
insert into fixture_ids select 'tag_a2', id from tag_a2;

with item_a as (
  select public.create_library_item(
    'link', 'Initial link', 'https://a.example/initial',
    'https://a.example/initial', null, null,
    array[(select id from fixture_ids where label = 'tag_a')]
  ) as id
)
insert into fixture_ids select 'item_a', id from item_a;

select is(
  (select count(*)::int from public.library_items where id = (select id from fixture_ids where label = 'item_a')),
  1,
  'create_library_item persists the item'
);

select is(
  (select count(*)::int from public.item_tags where item_id = (select id from fixture_ids where label = 'item_a')),
  1,
  'create_library_item persists selected tags in the same transaction'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

with tag_b as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'B One', 'red') returning id
)
insert into fixture_ids select 'tag_b', id from tag_b;

select throws_ok(
  format(
    $sql$select public.set_item_tags(%L, array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_b')
  ),
  'item não encontrado',
  'B cannot replace tags on A''s item'
);

select throws_ok(
  format(
    $sql$select public.create_library_item('link', 'must rollback', 'https://b.example/rollback', 'https://b.example/rollback', null, null, array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'tag_a')
  ),
  'uma ou mais tags não estão disponíveis',
  'B cannot create an item with A''s tag'
);

select is(
  (select count(*)::int from public.library_items where title = 'must rollback'),
  0,
  'an invalid tag rolls back the item insert'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select lives_ok(
  format(
    $sql$select public.update_library_item(%L, 'prompt', 'Updated prompt', null, null, 'Use this prompt', 'Changed', array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_a2')
  ),
  'update_library_item changes fields and replaces the tag set'
);

select is(
  (select tag_id from public.item_tags where item_id = (select id from fixture_ids where label = 'item_a')),
  (select id from fixture_ids where label = 'tag_a2'),
  'replacing tags removes the previous association and preserves the selected one'
);

select lives_ok(
  format(
    $sql$select public.set_item_tags(%L, array[]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_a')
  ),
  'set_item_tags accepts an empty selection to remove all tags'
);

select is(
  (select count(*)::int from public.item_tags where item_id = (select id from fixture_ids where label = 'item_a')),
  0,
  'removing all selected tags leaves the item intact and untagged'
);

select throws_ok(
  format(
    $sql$select public.update_library_item(%L, 'prompt', 'must rollback', null, null, 'Use this prompt', null, array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_a'),
    (select id from fixture_ids where label = 'tag_b')
  ),
  'uma ou mais tags não estão disponíveis',
  'an unavailable tag rejects the update'
);

select is(
  (select title from public.library_items where id = (select id from fixture_ids where label = 'item_a')),
  'Updated prompt',
  'a rejected tag replacement rolls back the item update'
);

delete from public.library_items where id = (select id from fixture_ids where label = 'item_a');

select is(
  (select count(*)::int from public.item_tags where item_id = (select id from fixture_ids where label = 'item_a')),
  0,
  'deleting an item removes all item-tag associations through the FK'
);

with item_code as (
  select public.create_library_item(
    'code_component', 'Code snippet', 'https://code.example/btn',
    'https://code.example/btn', '<Button />', 'Botão React',
    array[(select id from fixture_ids where label = 'tag_a')]
  ) as id
)
insert into fixture_ids select 'item_code', id from item_code;

select is(
  (select type::text from public.library_items where id = (select id from fixture_ids where label = 'item_code')),
  'code_component',
  'create_library_item creates code_component item'
);

select is(
  (select content from public.library_items where id = (select id from fixture_ids where label = 'item_code')),
  '<Button />',
  'create_library_item persists code_component content'
);

select lives_ok(
  format(
    $sql$select public.update_library_item(%L, 'code_component', 'Updated snippet', null, null, '<UpdatedButton />', 'Novo botão', array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_code'),
    (select id from fixture_ids where label = 'tag_a2')
  ),
  'update_library_item updates code_component fields'
);

select is(
  (select content from public.library_items where id = (select id from fixture_ids where label = 'item_code')),
  '<UpdatedButton />',
  'code_component content is updated correctly'
);

select * from finish();

rollback;

-- Search, filter, sort, keyset pagination, rollup deduplication and RLS.
begin;

-- Todos os fixtures nascem com updated_at = now(), que é constante dentro
-- da transação; sem desligar o trigger não existe ordenação determinística
-- por updated_at para testar o sort 'updated'. O rollback do final do
-- arquivo restaura o trigger.
alter table public.library_items disable trigger library_items_set_updated_at;

select plan(27);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

-- Ordenação de referência, calculada por uma query escrita à mão e
-- independente da RPC: cada linha guarda a posição que o item ocupa em um
-- dos cinco sorts. As asserções de cursor comparam a saída da RPC contra
-- estas posições.
create temporary table seq_order (
  sort text not null,
  position int not null,
  id uuid not null,
  title text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (sort, position)
);
grant select, insert on seq_order to authenticated;

create function pg_temp.seq_cursor(p_sort text, p_position int, p_dir text)
returns jsonb
language sql
stable
as $$
  select case
    when p_sort in ('newest', 'oldest') then jsonb_build_object('timestamp', so.created_at, 'id', so.id, 'dir', p_dir)
    when p_sort = 'updated' then jsonb_build_object('timestamp', so.updated_at, 'id', so.id, 'dir', p_dir)
    else jsonb_build_object('title', so.title, 'id', so.id, 'dir', p_dir)
  end
  from pg_temp.seq_order so
  where so.sort = p_sort and so.position = p_position;
$$;

insert into fixture_ids values ('user_a', (select tests.create_user('search-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('search-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with root_tag as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Research', 'lime') returning id
)
insert into fixture_ids select 'root_tag', id from root_tag;

with child_tag as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'root_tag'), 'Postgres', 'blue') returning id
)
insert into fixture_ids select 'child_tag', id from child_tag;

with other_tag as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Other', 'red') returning id
)
insert into fixture_ids select 'other_tag', id from other_tag;

with item as (
  select public.create_library_item(
    'prompt', 'Alpha rollup', null, null, 'Postgres rollup phrase', null,
    array[(select id from fixture_ids where label = 'root_tag'), (select id from fixture_ids where label = 'child_tag')]
  ) as id
)
insert into fixture_ids select 'rollup_item', id from item;

with item as (
  select public.create_library_item(
    'link', 'Zulu docs', 'https://docs.example/postgres', 'https://docs.example/postgres', null, null,
    array[(select id from fixture_ids where label = 'root_tag')]
  ) as id
)
insert into fixture_ids select 'link_item', id from item;

with item as (
  select public.create_library_item(
    'link', 'Outside item', 'https://outside.example', 'https://outside.example', null, null,
    array[(select id from fixture_ids where label = 'other_tag')]
  ) as id
)
insert into fixture_ids select 'outside_item', id from item;

with item as (
  select public.create_library_item(
    'code_component', 'Counter Hook', 'https://hooks.example/counter', 'https://hooks.example/counter',
    'export function useCounter() { return useState(0); }', 'React hook de contagem',
    array[(select id from fixture_ids where label = 'other_tag')]
  ) as id
)
insert into fixture_ids select 'code_item', id from item;

with seq_tag as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Sequência', 'amber') returning id
)
insert into fixture_ids select 'seq_tag', id from seq_tag;

-- Quatro itens cujos timestamps e títulos produzem uma permutação
-- diferente em cada um dos cinco sorts, de modo que uma coluna de
-- ordenação trocada por outra reprova o teste.
do $seq$
declare
  v_seq_tag uuid := (select id from fixture_ids where label = 'seq_tag');
  v_id uuid;
  v_spec record;
begin
  for v_spec in
    select * from (values
      ('Seq A', timestamptz '2026-01-04 00:00:00+00', timestamptz '2026-02-02 00:00:00+00'),
      ('Seq B', timestamptz '2026-01-02 00:00:00+00', timestamptz '2026-02-04 00:00:00+00'),
      ('Seq C', timestamptz '2026-01-03 00:00:00+00', timestamptz '2026-02-01 00:00:00+00'),
      ('Seq D', timestamptz '2026-01-01 00:00:00+00', timestamptz '2026-02-03 00:00:00+00')
    ) as s(title, created_at, updated_at)
  loop
    v_id := public.create_library_item(
      'link',
      v_spec.title,
      'https://seq.example/' || lower(right(v_spec.title, 1)),
      'https://seq.example/' || lower(right(v_spec.title, 1)),
      null,
      null,
      array[v_seq_tag]
    );

    update public.library_items
    set created_at = v_spec.created_at,
        updated_at = v_spec.updated_at
    where id = v_id;
  end loop;
end
$seq$;

insert into seq_order (sort, position, id, title, created_at, updated_at)
select 'newest', row_number() over (order by li.created_at desc, li.id desc),
       li.id, li.title, li.created_at, li.updated_at
from public.library_items li
where exists (select 1 from public.item_tags it
              where it.item_id = li.id and it.tag_id = (select id from fixture_ids where label = 'seq_tag'));

insert into seq_order (sort, position, id, title, created_at, updated_at)
select 'oldest', row_number() over (order by li.created_at asc, li.id asc),
       li.id, li.title, li.created_at, li.updated_at
from public.library_items li
where exists (select 1 from public.item_tags it
              where it.item_id = li.id and it.tag_id = (select id from fixture_ids where label = 'seq_tag'));

insert into seq_order (sort, position, id, title, created_at, updated_at)
select 'updated', row_number() over (order by li.updated_at desc, li.id desc),
       li.id, li.title, li.created_at, li.updated_at
from public.library_items li
where exists (select 1 from public.item_tags it
              where it.item_id = li.id and it.tag_id = (select id from fixture_ids where label = 'seq_tag'));

insert into seq_order (sort, position, id, title, created_at, updated_at)
select 'title_asc', row_number() over (order by li.title asc, li.id asc),
       li.id, li.title, li.created_at, li.updated_at
from public.library_items li
where exists (select 1 from public.item_tags it
              where it.item_id = li.id and it.tag_id = (select id from fixture_ids where label = 'seq_tag'));

insert into seq_order (sort, position, id, title, created_at, updated_at)
select 'title_desc', row_number() over (order by li.title desc, li.id desc),
       li.id, li.title, li.created_at, li.updated_at
from public.library_items li
where exists (select 1 from public.item_tags it
              where it.item_id = li.id and it.tag_id = (select id from fixture_ids where label = 'seq_tag'));

select is(
  (select count(*)::int from public.search_library('rollup', (select id from fixture_ids where label = 'root_tag'))),
  1,
  'full-text search reaches prompt content through a selected tag rollup'
);

select is(
  (select count(*)::int from public.search_library(null, (select id from fixture_ids where label = 'root_tag')) where id = (select id from fixture_ids where label = 'rollup_item')),
  1,
  'an item tagged on both root and child appears only once in rollup'
);

select is(
  (select count(*)::int from public.search_library('docs.example', null)),
  1,
  'partial URL search finds a link'
);

select is(
  (select count(*)::int from public.search_library(null, null, true, array['prompt']::public.item_type[])),
  1,
  'type filter combines with the library query'
);

select is(
  (select count(*)::int from public.search_library('useCounter', null)),
  1,
  'full-text search finds code_component by snippet content'
);

select is(
  (select content_preview from public.search_library('useCounter', null)),
  'export function useCounter() { return useState(0); }',
  'search_library returns content_preview for code_component'
);

select is(
  (select count(*)::int from public.search_library(null, null, true, array['code_component']::public.item_type[])),
  1,
  'type filter code_component returns only code component items'
);

select is(
  (select array_agg(title) from public.search_library(null, (select id from fixture_ids where label = 'root_tag'), true, null, 'title_asc')),
  array['Alpha rollup', 'Zulu docs'],
  'title sort is predictable'
);

select is(
  (with first_page as (
    select * from public.search_library(null, (select id from fixture_ids where label = 'root_tag'), true, null, 'title_asc', null, 1)
  )
  select count(*)::int
  from public.search_library(
    null,
    (select id from fixture_ids where label = 'root_tag'),
    true,
    null,
    'title_asc',
    (select jsonb_build_object('title', title, 'id', id) from first_page),
    49
  )),
  1,
  'keyset cursor returns the next page without duplicating the first item'
);

select is(
  (with second_page as (
    select * from public.search_library(null, (select id from fixture_ids where label = 'root_tag'), true, null, 'title_asc', null, 49) offset 1
  )
  select count(*)::int
  from public.search_library(
    null,
    (select id from fixture_ids where label = 'root_tag'),
    true,
    null,
    'title_asc',
    (select jsonb_build_object('title', title, 'id', id, 'dir', 'prev') from second_page),
    49
  )),
  1,
  'backward keyset cursor returns the previous page item'
);

-- 10 combinações de sort x direção de cursor
select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'newest', pg_temp.seq_cursor('newest', 2, 'next'), 49) x) s),
  (select array_agg(so.id order by so.position) from seq_order so where so.sort = 'newest' and so.position > 2),
  'newest/next continues from the reference ordering'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'newest', pg_temp.seq_cursor('newest', 3, 'prev'), 49) x) s),
  (select array_agg(so.id order by so.position desc) from seq_order so where so.sort = 'newest' and so.position < 3),
  'newest/prev walks back in inverted order'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'oldest', pg_temp.seq_cursor('oldest', 2, 'next'), 49) x) s),
  (select array_agg(so.id order by so.position) from seq_order so where so.sort = 'oldest' and so.position > 2),
  'oldest/next continues from the reference ordering'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'oldest', pg_temp.seq_cursor('oldest', 3, 'prev'), 49) x) s),
  (select array_agg(so.id order by so.position desc) from seq_order so where so.sort = 'oldest' and so.position < 3),
  'oldest/prev walks back in inverted order'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'updated', pg_temp.seq_cursor('updated', 2, 'next'), 49) x) s),
  (select array_agg(so.id order by so.position) from seq_order so where so.sort = 'updated' and so.position > 2),
  'updated/next continues from the reference ordering'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'updated', pg_temp.seq_cursor('updated', 3, 'prev'), 49) x) s),
  (select array_agg(so.id order by so.position desc) from seq_order so where so.sort = 'updated' and so.position < 3),
  'updated/prev walks back in inverted order'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'title_asc', pg_temp.seq_cursor('title_asc', 2, 'next'), 49) x) s),
  (select array_agg(so.id order by so.position) from seq_order so where so.sort = 'title_asc' and so.position > 2),
  'title_asc/next continues from the reference ordering'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'title_asc', pg_temp.seq_cursor('title_asc', 3, 'prev'), 49) x) s),
  (select array_agg(so.id order by so.position desc) from seq_order so where so.sort = 'title_asc' and so.position < 3),
  'title_asc/prev walks back in inverted order'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'title_desc', pg_temp.seq_cursor('title_desc', 2, 'next'), 49) x) s),
  (select array_agg(so.id order by so.position) from seq_order so where so.sort = 'title_desc' and so.position > 2),
  'title_desc/next continues from the reference ordering'
);

select is(
  (select array_agg(s.id order by s.rn) from (
    select x.id, row_number() over () as rn
    from public.search_library(null, (select id from fixture_ids where label = 'seq_tag'), true, null,
      'title_desc', pg_temp.seq_cursor('title_desc', 3, 'prev'), 49) x) s),
  (select array_agg(so.id order by so.position desc) from seq_order so where so.sort = 'title_desc' and so.position < 3),
  'title_desc/prev walks back in inverted order'
);

-- O teto do RPC precisa ser explícito e verificável, porque
-- lib/database/queries/items.ts pede p_limit = PAGE_SIZE + 1 e um clamp
-- silencioso faria o botão "Próxima página" sumir sem erro.
select lives_ok(
  $$select * from public.search_library(null, null, true, null, 'newest', null, 49)$$,
  'p_limit igual ao teto do RPC (49) é aceito'
);

select throws_ok(
  $$select * from public.search_library(null, null, true, null, 'newest', null, 50)$$,
  'limite inválido',
  'p_limit acima do teto é rejeitado em vez de clampado em silêncio'
);

select throws_ok(
  $$select * from public.search_library(null, null, true, null, 'newest', null, 0)$$,
  'limite inválido',
  'p_limit abaixo de 1 é rejeitado'
);

select throws_ok(
  $$select * from public.search_library(null, null, true, null, 'manual')$$,
  'ordenação inválida',
  'unknown sort is rejected inside the RPC'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.search_library(null, (select id from fixture_ids where label = 'root_tag'))),
  0,
  'RLS prevents another user from reading a selected tag and its items'
);

select is(
  (select count(*)::int from public.search_library('rollup', null)),
  0,
  'RLS prevents another user from searching A''s prompt content'
);

select is(
  (select count(*)::int from public.search_library('useCounter', null)),
  0,
  'RLS prevents another user from searching A''s code_component content'
);

select * from finish();

rollback;

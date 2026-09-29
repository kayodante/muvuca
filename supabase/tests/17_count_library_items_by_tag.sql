-- AAA-182: count_library_items_by_tag (0034) devolve numa chamada o mesmo
-- número que count_library_items_for_tag (0025) dá para cada tag -- rollup
-- pela subárvore, item deduplicado -- e nada que seja de outro usuário, nem
-- com o RLS desligado (o que um `security definer` faria).

begin;

select plan(5);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('rollup-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('rollup-b@muvuca.test')));

-- A: Design > Tipografia > Serifadas, mais Receitas (solta) e Vazia (sem item).
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with t as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Design', 'lime') returning id
)
insert into fixture_ids select 'design', id from t;

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'design'), 'Tipografia', 'blue')
  returning id
)
insert into fixture_ids select 'tipografia', id from t;

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'tipografia'), 'Serifadas', 'rose')
  returning id
)
insert into fixture_ids select 'serifadas', id from t;

with t as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Receitas', 'amber') returning id
)
insert into fixture_ids select 'receitas', id from t;

with t as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Vazia', 'teal') returning id
)
insert into fixture_ids select 'vazia', id from t;

-- Marcado com pai e filho ao mesmo tempo: conta uma vez em Design.
select public.create_library_item(
  'link', 'Guia', 'https://a.example/guia', 'https://a.example/guia', null, null,
  array[(select id from fixture_ids where label = 'design'),
        (select id from fixture_ids where label = 'tipografia')]
);
select public.create_library_item(
  'link', 'Garamond', 'https://a.example/garamond', 'https://a.example/garamond', null, null,
  array[(select id from fixture_ids where label = 'serifadas')]
);
select public.create_library_item(
  'prompt', 'Bolo', null, null, 'Receita de bolo', null,
  array[(select id from fixture_ids where label = 'receitas')]
);
select public.create_library_item('prompt', 'Solto', null, null, 'Sem tag', null, array[]::uuid[]);

select set_eq(
  $$ select tag_id, item_count from public.count_library_items_by_tag() $$,
  $$
    select f.id, v.n::bigint
    from (values ('design', 2), ('tipografia', 2), ('serifadas', 1), ('receitas', 1)) v(label, n)
    join fixture_ids f using (label)
  $$,
  'A: rollup deduplicado por tag; tag sem item fica de fora'
);

select is_empty(
  $$
    select t.id
    from public.tags t
    left join public.count_library_items_by_tag() c on c.tag_id = t.id
    where coalesce(c.item_count, 0) <> public.count_library_items_for_tag(t.id)
  $$,
  'A: cada tag bate com count_library_items_for_tag (0025)'
);

-- B: a própria "Design" com um item.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

with t as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Design', 'lime') returning id
)
insert into fixture_ids select 'design_b', id from t;

select public.create_library_item(
  'link', 'Guia', 'https://a.example/guia', 'https://a.example/guia', null, null,
  array[(select id from fixture_ids where label = 'design_b')]
);

select set_eq(
  $$ select tag_id, item_count from public.count_library_items_by_tag() $$,
  $$ select id, 1::bigint from fixture_ids where label = 'design_b' $$,
  'B: só as próprias tags, nenhuma de A'
);

-- Sem RLS o SELECT enxergaria as linhas de todo mundo; só o filtro por
-- auth.uid() da 0034 segura o escopo. O rollback no fim religa o RLS.
select tests.clear_authentication();

alter table public.tags disable row level security;
alter table public.item_tags disable row level security;

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select set_eq(
  $$ select tag_id, item_count from public.count_library_items_by_tag() $$,
  $$ select id, 1::bigint from fixture_ids where label = 'design_b' $$,
  'B com RLS desligado: continua só com as próprias tags'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select is(
  (select sum(item_count) from public.count_library_items_by_tag()),
  6::numeric,
  'A com RLS desligado: os mesmos 2+2+1+1, nada de B somado'
);

select * from finish();

rollback;

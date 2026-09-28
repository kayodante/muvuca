-- AAA-82: as RPCs de escrita escopam por usuário sozinhas, sem depender do
-- RLS. Os casos cross-user com RLS ligado já estão em 07 e 10; aqui o RLS
-- das três tabelas é desligado dentro da transação (o rollback no fim o
-- religa), o que reproduz o que um `security definer` faria: o SELECT passa
-- a enxergar as linhas de todo mundo. Se alguém remover um
-- `user_id = (select auth.uid())` de 0033, este arquivo fica vermelho --
-- com RLS ligado, nenhum outro ficaria.

begin;

select plan(9);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

create temporary table result_counts (label text primary key, items integer, tags integer);
grant select, insert on result_counts to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('scope-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('scope-b@muvuca.test')));

-- A: pasta "Trabalho", um link com essa tag, um prompt e um code component.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with tag_a as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Trabalho', 'lime') returning id
)
insert into fixture_ids select 'tag_a', id from tag_a;

with item_a as (
  select public.create_library_item(
    'link', 'Docs', 'https://shared.example/docs', 'https://shared.example/docs',
    null, null, array[(select id from fixture_ids where label = 'tag_a')]
  ) as id
)
insert into fixture_ids select 'item_a', id from item_a;

select public.create_library_item('prompt', 'Resumo', null, null, 'Resuma o texto', null, array[]::uuid[]);
select public.create_library_item('code_component', 'Botão', null, null, '<Button />', null, array[]::uuid[]);

-- B: o mesmo link, ainda sem tag.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

with item_b as (
  select public.create_library_item(
    'link', 'Docs', 'https://shared.example/docs', 'https://shared.example/docs',
    null, null, array[]::uuid[]
  ) as id
)
insert into fixture_ids select 'item_b', id from item_b;

select tests.clear_authentication();

alter table public.tags disable row level security;
alter table public.library_items disable row level security;
alter table public.item_tags disable row level security;

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

-- import_browser_bookmarks: pasta de nome idêntico à de A vira tag nova de B.
insert into result_counts
select 'bookmarks', items_imported, tags_created
from public.import_browser_bookmarks(
  '[{"key":"t1","parentKey":null,"name":"Trabalho"}]'::jsonb,
  '[]'::jsonb
);

select is(
  (select tags from result_counts where label = 'bookmarks'),
  1,
  'import_browser_bookmarks: B cria a própria "Trabalho" em vez de reusar a de A'
);

-- import_library_backup: a mesma pasta, o link que B já tem (caminho do
-- SELECT após on conflict) e prompt/code idênticos aos de A.
select lives_ok(
  $sql$
    insert into result_counts
    select 'backup', items_imported, tags_created
    from public.import_library_backup(
      '[{"key":"t1","parentKey":null,"name":"Trabalho"}]'::jsonb,
      '[{"type":"link","title":"Docs","url":"https://shared.example/docs","normalizedUrl":"https://shared.example/docs","tagKeys":["t1"]},
        {"type":"prompt","title":"Resumo","content":"Resuma o texto"},
        {"type":"code_component","title":"Botão","content":"<Button />"}]'::jsonb
    )
  $sql$,
  'import_library_backup: B restaura sem esbarrar nas linhas de A'
);

select is(
  (select items from result_counts where label = 'backup'),
  2,
  'import_library_backup: prompt e code idênticos aos de A viram itens de B'
);

select is(
  (select count(*)::int from public.item_tags
     where item_id = (select id from fixture_ids where label = 'item_b')
       and user_id = (select id from fixture_ids where label = 'user_b')),
  1,
  'import_library_backup: a tag do link cai no item de B, não no de A'
);

-- set_item_tags: item de A e tag de A são inexistentes para B.
select throws_ok(
  format(
    $sql$select public.set_item_tags(%L, array[]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_a')
  ),
  'item não encontrado',
  'set_item_tags: B não alcança o item de A'
);

select throws_ok(
  format(
    $sql$select public.set_item_tags(%L, array[%L]::uuid[])$sql$,
    (select id from fixture_ids where label = 'item_b'),
    (select id from fixture_ids where label = 'tag_a')
  ),
  'uma ou mais tags não estão disponíveis',
  'set_item_tags: B não associa a tag de A'
);

select tests.clear_authentication();

select is(
  (select count(*)::int from public.item_tags
     where item_id = (select id from fixture_ids where label = 'item_a')),
  1,
  'as associações de A continuam intactas'
);

select is(
  (select count(*)::int from public.tags
     where name = 'Trabalho' and user_id = (select id from fixture_ids where label = 'user_b')),
  1,
  'B termina com uma única "Trabalho", compartilhada pelas duas importações'
);

select is(
  (select count(*)::int from public.library_items
     where user_id = (select id from fixture_ids where label = 'user_a')),
  3,
  'nenhum item de A foi reaproveitado nem alterado'
);

select * from finish();

rollback;

-- Importação de favoritos do navegador.
--
-- O caso central: reimportar o mesmo link dentro de uma pasta diferente
-- precisa criar a associação com a nova tag sem duplicar o item. Antes da
-- migration 0017 o RPC descartava a associação e o teste "o item passa a ter
-- as duas tags" falhava com 1.

begin;

select plan(13);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

create temporary table import_result (
  label text primary key,
  items_imported integer not null,
  tags_created integer not null,
  associations_created integer not null
);
grant select, insert on import_result to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('import-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('import-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- Primeira importação: pasta "Trabalho" com um link.
insert into import_result
select 'first', *
from public.import_browser_bookmarks(
  '[{"key":"tag_1","parentKey":null,"name":"Trabalho"}]'::jsonb,
  '[{"title":"Docs","url":"https://a.example/docs","normalizedUrl":"https://a.example/docs","tagKey":"tag_1"}]'::jsonb
);

select is(
  (select items_imported from import_result where label = 'first'),
  1,
  'a primeira importação cria o item'
);

select is(
  (select associations_created from import_result where label = 'first'),
  1,
  'a primeira importação associa o item à pasta'
);

-- Segunda importação: o usuário reorganizou o favorito para a pasta
-- "Pesquisa" e reimportou o arquivo.
insert into import_result
select 'second', *
from public.import_browser_bookmarks(
  '[{"key":"tag_1","parentKey":null,"name":"Pesquisa"}]'::jsonb,
  '[{"title":"Docs","url":"https://a.example/docs","normalizedUrl":"https://a.example/docs","tagKey":"tag_1"}]'::jsonb
);

select is(
  (select items_imported from import_result where label = 'second'),
  0,
  'reimportar o mesmo link não duplica o item'
);

select is(
  (select associations_created from import_result where label = 'second'),
  1,
  'reimportar o mesmo link cria a associação com a nova pasta'
);

select is(
  (select count(*)::int from public.library_items where normalized_url = 'https://a.example/docs'),
  1,
  'o link continua existindo uma única vez na biblioteca'
);

select is(
  (select count(*)::int from public.item_tags
     where item_id = (select id from public.library_items where normalized_url = 'https://a.example/docs')),
  2,
  'o item passa a ter a tag antiga e a tag da nova pasta'
);

-- Terceira importação, idêntica à segunda: nada de novo deve ser gravado.
insert into import_result
select 'third', *
from public.import_browser_bookmarks(
  '[{"key":"tag_1","parentKey":null,"name":"Pesquisa"}]'::jsonb,
  '[{"title":"Docs","url":"https://a.example/docs","normalizedUrl":"https://a.example/docs","tagKey":"tag_1"}]'::jsonb
);

select is(
  (select associations_created from import_result where label = 'third'),
  0,
  'reimportar o arquivo sem mudanças não cria associações repetidas'
);

-- Mesma URL em duas pastas dentro do mesmo lote.
insert into import_result
select 'same_batch', *
from public.import_browser_bookmarks(
  '[{"key":"tag_1","parentKey":null,"name":"Alpha"},{"key":"tag_2","parentKey":null,"name":"Beta"}]'::jsonb,
  '[{"title":"Compartilhado","url":"https://a.example/shared","normalizedUrl":"https://a.example/shared","tagKey":"tag_1"},
    {"title":"Compartilhado","url":"https://a.example/shared","normalizedUrl":"https://a.example/shared","tagKey":"tag_2"}]'::jsonb
);

select is(
  (select items_imported from import_result where label = 'same_batch'),
  1,
  'a mesma URL repetida no arquivo cria um único item'
);

select is(
  (select count(*)::int from public.item_tags
     where item_id = (select id from public.library_items where normalized_url = 'https://a.example/shared')),
  2,
  'a mesma URL em duas pastas recebe as duas tags'
);

-- Isolamento entre usuários: B importa a mesma URL e ganha o próprio item.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

insert into import_result
select 'user_b', *
from public.import_browser_bookmarks(
  '[{"key":"tag_1","parentKey":null,"name":"Trabalho"}]'::jsonb,
  '[{"title":"Docs","url":"https://a.example/docs","normalizedUrl":"https://a.example/docs","tagKey":"tag_1"}]'::jsonb
);

select is(
  (select items_imported from import_result where label = 'user_b'),
  1,
  'B cria o próprio item e não enxerga nem reaproveita o de A'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select is(
  (select count(*)::int from public.item_tags
     where item_id = (select id from public.library_items where normalized_url = 'https://a.example/docs')),
  2,
  'a importação de B não altera as associações de A'
);

-- A cor da pasta importada é sorteada dentro do RPC (migration 0022), num
-- pool que exclui os três neutros. Sem estas duas asserções, remover a
-- expressão de sorteio e voltar para um literal fixo passaria verde.
insert into import_result
select 'colors', *
from public.import_browser_bookmarks(
  '[{"key":"t01","parentKey":null,"name":"Cor 01"},{"key":"t02","parentKey":null,"name":"Cor 02"},
    {"key":"t03","parentKey":null,"name":"Cor 03"},{"key":"t04","parentKey":null,"name":"Cor 04"},
    {"key":"t05","parentKey":null,"name":"Cor 05"},{"key":"t06","parentKey":null,"name":"Cor 06"},
    {"key":"t07","parentKey":null,"name":"Cor 07"},{"key":"t08","parentKey":null,"name":"Cor 08"},
    {"key":"t09","parentKey":null,"name":"Cor 09"},{"key":"t10","parentKey":null,"name":"Cor 10"},
    {"key":"t11","parentKey":null,"name":"Cor 11"},{"key":"t12","parentKey":null,"name":"Cor 12"}]'::jsonb,
  '[]'::jsonb
);

select is(
  (select count(*)::int from public.tags
     where name like 'Cor __' and color_token in ('slate', 'zinc', 'stone')),
  0,
  'nenhuma pasta importada nasce com um dos tons neutros'
);

-- Doze sorteios num pool de 26: cair tudo na mesma cor tem probabilidade
-- desprezível. Falha também se nenhuma tag for criada, já que a contagem
-- vira 0.
select ok(
  (select count(distinct color_token) from public.tags where name like 'Cor __') > 1,
  'as pastas importadas recebem cores variadas'
);

select * from finish();

rollback;

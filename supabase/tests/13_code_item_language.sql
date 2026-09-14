-- AAA-106: coluna language em code_component -- allowlist da constraint,
-- restrição ao tipo code_component, projeção no search_library, troca via
-- update_library_item e restauração via import_library_backup.

begin;

select plan(8);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('language-a@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with item_code as (
  select public.create_library_item(
    'code_component', 'Snippet TS', null, null,
    'const answer: number = 42;', null,
    '{}'::uuid[], 'typescript'
  ) as id
)
insert into fixture_ids select 'item_code', id from item_code;

select is(
  (select language from public.library_items where id = (select id from fixture_ids where label = 'item_code')),
  'typescript',
  'create_library_item persists language on code_component'
);

select throws_ok(
  $sql$select public.create_library_item('code_component', 'Snippet Blob', null, null, '???', null, '{}'::uuid[], 'blob')$sql$,
  '23514'::character(5),
  null::text,
  'a language outside the allowed list is rejected'
);

select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, url, normalized_url, language)
    values (auth.uid(), 'link', 'Link com lang', 'https://lang.example/', 'https://lang.example/', 'css')
  $sql$,
  '23514'::character(5),
  null::text,
  'a link with language is rejected'
);

select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content, language)
    values (auth.uid(), 'prompt', 'Prompt com lang', 'conteúdo', 'yaml')
  $sql$,
  '23514'::character(5),
  null::text,
  'a prompt with language is rejected'
);

select is(
  (select language from public.search_library(null, null) where id = (select id from fixture_ids where label = 'item_code')),
  'typescript',
  'search_library returns the language column'
);

select lives_ok(
  format(
    $sql$select public.update_library_item(%L, 'code_component', 'Snippet TS', null, null, 'print("oi")', null, '{}'::uuid[], 'python')$sql$,
    (select id from fixture_ids where label = 'item_code')
  ),
  'update_library_item accepts a new language'
);

select is(
  (select language from public.library_items where id = (select id from fixture_ids where label = 'item_code')),
  'python',
  'the new language persists after update_library_item'
);

select public.import_library_backup(
  '[]'::jsonb,
  $json$[{"type": "code_component", "title": "Backup Snippet", "url": null,
   "normalizedUrl": null, "content": "fn main() {}", "description": null,
   "language": "rust", "tagKeys": []}]$json$::jsonb
);

select is(
  (select language from public.library_items where title = 'Backup Snippet'),
  'rust',
  'import_library_backup restores language on code_component'
);

select * from finish();

rollback;

-- Restauração do backup JSON: reconstrução completa, idempotência,
-- reconciliação de tags em duplicata, atomicidade completa da restauração,
-- restauração só com tags, rejeição de payload vazio e isolamento entre
-- usuários.

begin;

select plan(33);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('backup-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('backup-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- Payload equivalente a um arquivo exportado: uma tag raiz (com descrição e
-- data de criação autorais), uma filha, um link associado à filha e um
-- prompt sem tag.
create temporary view backup_tags as
select $json$[
  {"key": "aaaaaaaa-0000-4000-8000-000000000001", "parentKey": null,
   "name": "Dev", "colorToken": "lime", "description": "Ferramentas de dev",
   "createdAt": "2026-08-10T00:00:00+00:00"},
  {"key": "aaaaaaaa-0000-4000-8000-000000000002",
   "parentKey": "aaaaaaaa-0000-4000-8000-000000000001",
   "name": "Frontend", "colorToken": "cyan", "description": null,
   "createdAt": "2026-08-11T00:00:00+00:00"}
]$json$::jsonb as value;

create temporary view backup_items as
select $json$[
  {"type": "link", "title": "Next.js", "url": "https://nextjs.org/",
   "normalizedUrl": "https://nextjs.org/", "content": null,
   "description": "Framework React", "createdAt": "2026-08-15T00:00:00+00:00",
   "tagKeys": ["aaaaaaaa-0000-4000-8000-000000000002"]},
  {"type": "prompt", "title": "Refatorar", "url": null,
   "normalizedUrl": null, "content": "Refatore este código",
   "description": null, "createdAt": "2026-08-14T00:00:00+00:00",
   "tagKeys": []}
]$json$::jsonb as value;

grant select on backup_tags, backup_items to authenticated;

select is(
  (select items_imported from public.import_library_backup(
     (select value from backup_tags), (select value from backup_items))),
  2,
  'restauração cria os dois itens do arquivo'
);

select is(
  (select count(*)::int from public.tags),
  2,
  'restauração cria as duas tags do arquivo'
);

select is(
  (select parent_id from public.tags where name = 'Frontend'),
  (select id from public.tags where name = 'Dev'),
  'a hierarquia de tags é preservada'
);

select is(
  (select color_token from public.tags where name = 'Frontend'),
  'cyan',
  'a cor da tag é restaurada'
);

select is(
  (select description from public.tags where name = 'Dev'),
  'Ferramentas de dev',
  'a descrição da tag é restaurada'
);

select is(
  (select created_at from public.tags where name = 'Dev'),
  '2026-08-10T00:00:00+00:00'::timestamptz,
  'a data de criação da tag é restaurada'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Next.js'),
  1,
  'a associação item-tag é restaurada'
);

select is(
  (select description from public.library_items where title = 'Next.js'),
  'Framework React',
  'a descrição do item é restaurada'
);

select is(
  (select created_at from public.library_items where title = 'Refatorar'),
  '2026-08-14T00:00:00+00:00'::timestamptz,
  'a data de criação original é restaurada'
);

-- Idempotência: reexecutar o mesmo payload não duplica nada.
select is(
  (select duplicates_ignored from public.import_library_backup(
     (select value from backup_tags), (select value from backup_items))),
  2,
  'reexecutar a restauração conta duplicatas em vez de duplicar itens'
);

select is(
  (select count(*)::int from public.library_items),
  2,
  'a segunda restauração não cria linhas novas'
);

-- Reconciliação de tags em duplicata: um backup mais novo associa o link e o
-- prompt já existentes a tags que eles ainda não tinham, sem duplicar a
-- associação antiga nem sobrescrever os campos do item: um item duplicado é
-- ignorado, mas a associação de tag, não.
-- Cada chamada carrega a árvore de tags inteira, inclusive as já existentes:
-- o mapa de chaves simbólicas (v_tag_ids) só existe dentro desta chamada, e
-- "Frontend"/"Dev" precisam estar aqui para que o item possa referenciá-las
-- de novo -- exatamente o que um cliente real faz, já que agora só existe
-- uma chamada por restauração (toBackupPayload sempre inclui todas as tags).
create temporary table dup_reconcile_result as
select * from public.import_library_backup(
  $json$[
    {"key": "aaaaaaaa-0000-4000-8000-000000000001", "parentKey": null,
     "name": "Dev", "colorToken": "lime", "description": "Ferramentas de dev",
     "createdAt": "2026-08-10T00:00:00+00:00"},
    {"key": "aaaaaaaa-0000-4000-8000-000000000002",
     "parentKey": "aaaaaaaa-0000-4000-8000-000000000001",
     "name": "Frontend", "colorToken": "cyan", "description": null,
     "createdAt": "2026-08-11T00:00:00+00:00"},
    {"key": "cccccccc-0000-4000-8000-000000000001", "parentKey": null,
     "name": "Referências", "colorToken": "amber", "description": null,
     "createdAt": "2026-08-16T00:00:00+00:00"},
    {"key": "cccccccc-0000-4000-8000-000000000002", "parentKey": null,
     "name": "Notas", "colorToken": "violet", "description": null,
     "createdAt": "2026-08-16T00:00:00+00:00"}
  ]$json$::jsonb,
  $json$[
    {"type": "link", "title": "Next.js", "url": "https://nextjs.org/",
     "normalizedUrl": "https://nextjs.org/", "content": null,
     "description": "Framework React", "createdAt": "2026-08-15T00:00:00+00:00",
     "tagKeys": ["aaaaaaaa-0000-4000-8000-000000000002",
                 "cccccccc-0000-4000-8000-000000000001"]},
    {"type": "prompt", "title": "Refatorar", "url": null,
     "normalizedUrl": null, "content": "Refatore este código",
     "description": null, "createdAt": "2026-08-14T00:00:00+00:00",
     "tagKeys": ["cccccccc-0000-4000-8000-000000000002"]}
  ]$json$::jsonb
);

select is(
  (select tags_created from dup_reconcile_result),
  2,
  'as duas tags novas do backup reconciliado são criadas'
);

select is(
  (select duplicates_ignored from dup_reconcile_result),
  2,
  'link e prompt continuam sendo contados como duplicatas'
);

select is(
  (select count(*)::int from public.library_items),
  2,
  'nenhuma linha de item nova é criada pela reconciliação'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Next.js'),
  2,
  'o link duplicado ganha a tag nova sem duplicar a associação antiga'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Refatorar'),
  1,
  'o prompt duplicado ganha a tag nova do backup'
);

-- Atomicidade completa: um payload com uma tag nova e dois itens, o primeiro
-- válido (seria persistido se estivesse sozinho) e o segundo referenciando
-- uma tag ausente do lote. A tag e o primeiro item são processados antes da
-- exceção -- a prova real de atomicidade é que nenhum dos dois sobra depois
-- do rollback, não só que o item inválido foi rejeitado.
select throws_ok(
  $sql$select public.import_library_backup(
    '[{"key": "cccccccc-0000-4000-8000-000000000003", "parentKey": null,
       "name": "Provisória", "colorToken": "stone", "description": null,
       "createdAt": "2026-08-16T00:00:00+00:00"}]'::jsonb,
    '[{"type": "link", "title": "Item Parcial", "url": "https://parcial.example/",
       "normalizedUrl": "https://parcial.example/", "content": null,
       "description": null, "createdAt": "2026-08-16T00:00:00+00:00",
       "tagKeys": ["cccccccc-0000-4000-8000-000000000003"]},
      {"type": "link", "title": "Órfão", "url": "https://orfao.example/",
       "normalizedUrl": "https://orfao.example/", "content": null,
       "description": null, "createdAt": "2026-08-15T00:00:00+00:00",
       "tagKeys": ["aaaaaaaa-0000-4000-8000-000000000009"]}]'::jsonb)$sql$,
  'tag do item ausente no lote',
  'tag desconhecida no segundo item aborta a restauração inteira'
);

select is(
  (select count(*)::int from public.tags where name = 'Provisória'),
  0,
  'a tag processada antes da falha não sobrevive ao rollback'
);

select is(
  (select count(*)::int from public.library_items where title = 'Item Parcial'),
  0,
  'o item processado com sucesso antes da falha não sobrevive ao rollback'
);

select is(
  (select count(*)::int from public.library_items),
  2,
  'a restauração incoerente não deixa item parcial'
);

-- Restauração só com tags: nenhum item no arquivo, mas há tags -- não pode
-- ser rejeitada (só o payload totalmente vazio é).
select is(
  (select items_imported from public.import_library_backup(
     '[{"key": "cccccccc-0000-4000-8000-000000000004", "parentKey": null,
        "name": "SóTag", "colorToken": "teal", "description": null,
        "createdAt": "2026-08-16T00:00:00+00:00"}]'::jsonb,
     '[]'::jsonb)),
  0,
  'restauração só com tags não importa nenhum item'
);

select is(
  (select count(*)::int from public.tags where name = 'SóTag'),
  1,
  'a tag do backup só-com-tags é criada mesmo sem nenhum item'
);

-- Payload totalmente vazio (nem tag, nem item) é aceito e retorna 0.
select is(
  (select items_imported from public.import_library_backup('[]'::jsonb, '[]'::jsonb)),
  0,
  'payload sem nenhuma tag e sem nenhum item é aceito e retorna 0'
);

-- Captura o id da tag "Dev" de A para comparar com a de B mais adiante,
-- antes de trocar a sessão de autenticação.
insert into fixture_ids
  values ('user_a_dev_tag', (select id from public.tags where name = 'Dev'));

-- Negativa cross-user obrigatória: nada que A restaurou aparece para B, e a
-- FK composta (id, user_id) de item_tags torna associação cruzada
-- estruturalmente impossível.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.library_items),
  0,
  'B não enxerga nada restaurado por A'
);

-- A consulta de resolução de tag da RPC (public.tags where parent_id is not
-- distinct from v_parent_id and name_normalized = ...) não filtra por
-- user_id explicitamente -- depende inteiramente da RLS. B restaura um
-- backup próprio reaproveitando o mesmo nome de tag raiz ("Dev") que A usou,
-- para provar que a RLS, e não uma checagem no SQL, é o que impede B de
-- reaproveitar a tag de A.
select is(
  (select tags_created from public.import_library_backup(
     '[{"key": "bbbbbbbb-0000-4000-8000-000000000001", "parentKey": null,
        "name": "Dev", "colorToken": "lime"}]'::jsonb,
     '[{"type": "link", "title": "Vite", "url": "https://vite.dev/",
        "normalizedUrl": "https://vite.dev/", "content": null,
        "description": null, "createdAt": "2026-08-15T00:00:00+00:00",
        "tagKeys": ["bbbbbbbb-0000-4000-8000-000000000001"]}]'::jsonb)),
  1,
  'B não reaproveita a tag "Dev" de A apesar do nome idêntico'
);

select isnt(
  (select id from public.tags where name = 'Dev'),
  (select id from fixture_ids where label = 'user_a_dev_tag'),
  'a tag "Dev" de B tem id diferente da tag "Dev" de A'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select is(
  (select count(*)::int from public.library_items),
  2,
  'os itens de A continuam intactos após a restauração de B'
);

-- Restauração e deduplicação de code_component
create temporary table backup_code_result as
select * from public.import_library_backup(
  $json$[
    {"key": "aaaaaaaa-0000-4000-8000-000000000002", "parentKey": null,
     "name": "Frontend", "colorToken": "cyan"}
  ]$json$::jsonb,
  $json$[
    {"type": "code_component", "title": "Modal Component", "url": "https://ui.example/modal",
     "normalizedUrl": "https://ui.example/modal", "content": "export function Modal() { return <div />; }",
     "description": "Componente modal acessível", "createdAt": "2026-08-16T00:00:00+00:00",
     "tagKeys": ["aaaaaaaa-0000-4000-8000-000000000002"]},
    {"type": "code_component", "title": "Button Component", "url": null,
     "normalizedUrl": null, "content": "export function Button() { return <button />; }",
     "description": null, "createdAt": "2026-08-16T00:00:00+00:00",
     "tagKeys": []}
  ]$json$::jsonb
);

select is(
  (select items_imported from backup_code_result),
  2,
  'restauração importa os itens do tipo code_component'
);

select is(
  (select type::text from public.library_items where title = 'Modal Component'),
  'code_component',
  'code_component é persistido com o tipo correto'
);

select is(
  (select content from public.library_items where title = 'Modal Component'),
  'export function Modal() { return <div />; }',
  'code_component é persistido com o conteúdo correto'
);

select is(
  (select url from public.library_items where title = 'Modal Component'),
  'https://ui.example/modal',
  'code_component opcionalmente persiste a URL de origem'
);

select is(
  (select duplicates_ignored from public.import_library_backup(
    $json$[{"key": "aaaaaaaa-0000-4000-8000-000000000002", "name": "Frontend"}]$json$::jsonb,
    $json$[
      {"type": "code_component", "title": "Modal Component", "url": "https://ui.example/modal",
       "normalizedUrl": "https://ui.example/modal", "content": "export function Modal() { return <div />; }",
       "description": "Componente modal acessível", "tagKeys": []},
      {"type": "code_component", "title": "Button Component", "url": null,
       "normalizedUrl": null, "content": "export function Button() { return <button />; }",
       "description": null, "tagKeys": []}
    ]$json$::jsonb
  )),
  2,
  'reimportar code_component existente deduplica por (title, content, normalized_url)'
);

select is(
  (select count(*)::int from public.library_items),
  4,
  'total de itens após importação e deduplicação de code_component é 4'
);

select * from finish();

rollback;

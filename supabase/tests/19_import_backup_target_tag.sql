-- AAA-246: importar backup dentro de uma tag existente (p_target_tag_id).
-- Cobre fusão da raiz homônima, raízes novas sob o destino, itens sem tag,
-- idempotência, profundidade máxima, isolamento entre usuários e o grant.

begin;

select plan(21);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('target-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('target-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- A: Design › Ícones.
with design as (
  insert into public.tags (user_id, name, color_token)
  values ((select auth.uid()), 'Design', 'lime') returning id
)
insert into fixture_ids select 'design', id from design;

with icones as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from fixture_ids where label = 'design'), 'Ícones', 'cyan')
  returning id
)
insert into fixture_ids select 'icones', id from icones;

-- (a) raiz do arquivo casa com filha existente do destino.
select is(
  (select tags_created from public.import_library_backup(
    '[{"key": "k1", "parentKey": null, "name": "Ícones"}]'::jsonb,
    '[{"type": "link", "title": "Lucide", "url": "https://lucide.dev/",
       "normalizedUrl": "https://lucide.dev/", "tagKeys": ["k1"]}]'::jsonb,
    (select id from fixture_ids where label = 'design'))),
  0,
  'a raiz do arquivo casa com a filha do destino e não cria tag'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Lucide'
      and it.tag_id = (select id from fixture_ids where label = 'icones')),
  1,
  'o link fica ligado a Design › Ícones'
);

select is(
  (select count(*)::int from public.tags where name = 'Ícones' and parent_id is null),
  0,
  'não existe raiz Ícones'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Lucide'
      and it.tag_id = (select id from fixture_ids where label = 'design')),
  0,
  'item com tag do arquivo não recebe o destino diretamente'
);

-- (b) raiz homônima (caixa diferente) funde no destino; filha nova vira filha dele.
select is(
  (select tags_created from public.import_library_backup(
    '[{"key": "r", "parentKey": null, "name": "design"},
      {"key": "c", "parentKey": "r", "name": "Novo"}]'::jsonb,
    '[]'::jsonb,
    (select id from fixture_ids where label = 'design'))),
  1,
  'fusão da raiz homônima cria só a filha'
);

select is(
  (select parent_id from public.tags where name = 'Novo'),
  (select id from fixture_ids where label = 'design'),
  'a filha da raiz fundida passa a ser filha do destino'
);

select is(
  (select count(*)::int from public.tags where lower(name) = 'design'),
  1,
  'a raiz fundida não duplica o destino'
);

-- (c) raiz inexistente vira filha do destino; (d) item sem tag recebe o destino.
select is(
  (select tags_created from public.import_library_backup(
    '[{"key": "x", "parentKey": null, "name": "Cores"}]'::jsonb,
    '[{"type": "prompt", "title": "Paleta", "content": "Sugira cores", "tagKeys": []}]'::jsonb,
    (select id from fixture_ids where label = 'design'))),
  1,
  'raiz inexistente é criada'
);

select is(
  (select parent_id from public.tags where name = 'Cores'),
  (select id from fixture_ids where label = 'design'),
  'a raiz nova fica sob o destino'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Paleta'
      and it.tag_id = (select id from fixture_ids where label = 'design')),
  1,
  'item sem tag no arquivo recebe o destino'
);

-- (e) idempotência.
select is(
  (select tags_created + items_imported from public.import_library_backup(
    '[{"key": "x", "parentKey": null, "name": "Cores"}]'::jsonb,
    '[{"type": "prompt", "title": "Paleta", "content": "Sugira cores", "tagKeys": []}]'::jsonb,
    (select id from fixture_ids where label = 'design'))),
  0,
  'repetir a importação não cria nada'
);

select is(
  (select count(*)::int from public.item_tags it
     join public.library_items li on li.id = it.item_id
    where li.title = 'Paleta'),
  1,
  'repetir a importação não duplica a ligação'
);

-- (f) sem destino (2 args): raiz do arquivo só casa com raiz, então cria raiz.
select is(
  (select tags_created from public.import_library_backup(
    '[{"key": "k1", "parentKey": null, "name": "Ícones"}]'::jsonb,
    '[]'::jsonb)),
  1,
  'sem destino, a raiz Ícones do arquivo cria uma raiz nova'
);

select is(
  (select count(*)::int from public.tags where name = 'Ícones' and parent_id is null),
  1,
  'sem destino, a raiz nova existe ao lado da filha'
);

-- (g) profundidade: destino no nível 5 + arquivo com 2 níveis.
insert into public.tags (user_id, name, color_token) values ((select auth.uid()), 'L1', 'stone');
insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from public.tags where name = 'L1'), 'L2', 'stone');
insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from public.tags where name = 'L2'), 'L3', 'stone');
insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from public.tags where name = 'L3'), 'L4', 'stone');
insert into public.tags (user_id, parent_id, name, color_token)
  values ((select auth.uid()), (select id from public.tags where name = 'L4'), 'L5', 'stone');

create temporary table before_counts as
  select (select count(*) from public.tags) as tags,
         (select count(*) from public.library_items) as items,
         (select count(*) from public.item_tags) as links;
grant select on before_counts to authenticated;

select throws_ok(
  format($q$select * from public.import_library_backup(
    '[{"key":"a","parentKey":null,"name":"N6"},{"key":"b","parentKey":"a","name":"N7"}]'::jsonb,
    '[{"type":"prompt","title":"Fundo","content":"x","tagKeys":[]}]'::jsonb,
    %L)$q$, (select id from public.tags where name = 'L5')),
  null,
  'a hierarquia de tags excede a profundidade máxima de 6 níveis',
  'destino no nível 5 com arquivo de 2 níveis estoura a profundidade'
);

select is(
  (select (select count(*) from public.tags) = tags
      and (select count(*) from public.library_items) = items
      and (select count(*) from public.item_tags) = links
     from before_counts),
  true,
  'profundidade excedida não persiste tag, item nem ligação'
);

-- (h) cross-user e (i) id inexistente.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select throws_ok(
  format($q$select * from public.import_library_backup(
    '[{"key":"a","parentKey":null,"name":"Invasor"}]'::jsonb,
    '[{"type":"prompt","title":"Invasor","content":"x","tagKeys":[]}]'::jsonb,
    %L)$q$, (select id from fixture_ids where label = 'design')),
  null,
  'tag não encontrada',
  'B não importa para dentro de uma tag de A'
);

select throws_ok(
  $q$select * from public.import_library_backup('[]'::jsonb, '[]'::jsonb,
    '00000000-0000-4000-8000-00000000dead')$q$,
  null,
  'tag não encontrada',
  'UUID inexistente é rejeitado'
);

select is(
  (select count(*)::int from public.tags)
    + (select count(*)::int from public.library_items)
    + (select count(*)::int from public.item_tags),
  0,
  'B não tem tag, item nem ligação após as tentativas'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select is(
  (select count(*)::int from public.tags where name in ('Invasor', 'N6', 'N7'))
    + (select count(*)::int from public.library_items where title in ('Invasor', 'Fundo')),
  0,
  'A não recebeu nada das tentativas de B nem do import estourado'
);

select tests.clear_authentication();

-- (j) grant.
select ok(
  not has_function_privilege('anon', 'public.import_library_backup(jsonb, jsonb, uuid)', 'execute'),
  'anon não executa a assinatura de 3 argumentos'
);

select * from finish();

rollback;

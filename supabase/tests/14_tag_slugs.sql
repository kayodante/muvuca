-- Slug de tag (AAA-96, 0031_tag_slugs.sql): a regra de slugify, unicidade
-- por irmãos com o índice como autoridade final, rename, reparent, a
-- colisão de delete_tag_reparent_children, tags_with_ancestors sob RLS e os
-- dois caminhos de importação. A corrida entre transações concorrentes não é
-- exercitada aqui (pgTAP roda numa transação só); ela é fechada pelo mesmo
-- advisory lock por usuário de 0008_tag_hierarchy.sql, e o índice único é a
-- rede de segurança -- provada no caso 21 com o trigger desligado.

begin;

select plan(37);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('slugs-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('slugs-b@muvuca.test')));
insert into fixture_ids values ('user_c', (select tests.create_user('slugs-c@muvuca.test')));

-- 1-13. Regra de slugify.
select is(public.slugify_tag_name('Design'), 'design', 'lowercase');
select is(public.slugify_tag_name('Recursos & Assets'), 'recursos-assets', '& vira separador');
select is(public.slugify_tag_name('Ícones'), 'icones', 'acento removido');
select is(public.slugify_tag_name('Inspiração & Ideias'), 'inspiracao-ideias', 'cedilha, til e &');
select is(public.slugify_tag_name('UI / UX'), 'ui-ux', 'barra vira separador');
select is(public.slugify_tag_name('  Muitos    espaços  '), 'muitos-espacos', 'espaços múltiplos e nas pontas');
select is(public.slugify_tag_name('a---b__c'), 'a-b-c', 'hífens repetidos e underscore colapsam');
select is(public.slugify_tag_name('C++ #1 (beta)!'), 'c-1-beta', 'caracteres especiais');
select is(public.slugify_tag_name('Ñandú Über ﬁ'), 'nandu-uber-fi', 'Unicode decomposto (NFKD)');
select is(public.slugify_tag_name('★'), 'tag', 'nome só com símbolo nunca gera slug vazio');
select is(public.slugify_tag_name('日本語'), 'tag', 'nome sem ASCII alfanumérico nunca gera slug vazio');
select is(char_length(public.slugify_tag_name(repeat('ﬁ', 80))), 80, 'base truncada em 80');
select is(
  public.slugify_tag_name(repeat('x', 79) || ' y'),
  repeat('x', 79),
  'truncamento não deixa hífen no fim'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- Árvore: Design > Recursos & Assets > {Ícones, Icones}.
with t as (
  insert into public.tags (user_id, name, color_token)
  values (auth.uid(), 'Design', 'lime') returning id
)
insert into fixture_ids select 'design', id from t;

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values (auth.uid(), (select id from fixture_ids where label = 'design'), 'Recursos & Assets', 'lime')
  returning id
)
insert into fixture_ids select 'recursos', id from t;

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values (auth.uid(), (select id from fixture_ids where label = 'recursos'), 'Ícones', 'lime')
  returning id
)
insert into fixture_ids select 'icones_acento', id from t;

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values (auth.uid(), (select id from fixture_ids where label = 'recursos'), 'Icones', 'lime')
  returning id
)
insert into fixture_ids select 'icones_sem_acento', id from t;

-- 14-17. Slug persistido e colisão pós-normalização no mesmo pai.
select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'design')),
  'design', 'insert persiste o slug derivado do nome'
);
select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'recursos')),
  'recursos-assets', 'filha recebe slug próprio'
);
select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'icones_acento')),
  'icones', 'primeiro irmão fica com a base'
);
select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'icones_sem_acento')),
  'icones-2', 'nome distinto com o mesmo slug ganha sufixo em vez de falhar'
);

-- 18. Mesmo slug em ramos diferentes.
with t as (
  insert into public.tags (user_id, name, color_token)
  values (auth.uid(), 'Dev', 'lime') returning id
)
insert into fixture_ids select 'dev', id from t;

insert into public.tags (user_id, parent_id, name, color_token)
values
  (auth.uid(), (select id from fixture_ids where label = 'design'), 'Referências', 'lime'),
  (auth.uid(), (select id from fixture_ids where label = 'dev'), 'Referências', 'lime');

select is(
  (select count(*)::int from public.tags where slug = 'referencias'),
  2, 'o mesmo slug é permitido sob pais diferentes'
);

-- 19. Mesmo slug para usuários diferentes.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

insert into public.tags (user_id, name, color_token) values (auth.uid(), 'Design', 'lime');

select is(
  (select slug from public.tags where name = 'Design'),
  'design', 'outro usuário pode ter o mesmo slug na raiz'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 20. Slug enviado que não é forma do nome é ignorado.
insert into public.tags (user_id, name, slug, color_token)
values (auth.uid(), 'Arquivo', 'admin', 'lime');

select is(
  (select slug from public.tags where name = 'Arquivo'),
  'arquivo', 'slug arbitrário vindo do cliente é substituído pelo derivado do nome'
);

-- 21. O índice único é a autoridade final, mesmo sem o trigger.
select tests.clear_authentication();
alter table public.tags disable trigger tags_set_slug;

select throws_ok(
  format(
    $sql$insert into public.tags (user_id, name, slug, color_token) values (%L, 'Design!', 'design', 'lime')$sql$,
    (select id from fixture_ids where label = 'user_a')
  ),
  '23505',
  null,
  'tags_unique_slug_per_parent bloqueia slug repetido entre irmãos raiz'
);

alter table public.tags enable trigger tags_set_slug;
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 22-24. Rename: UUID e associações intactos; slug acompanha o nome.
with i as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values (auth.uid(), 'link', 'Lucide', 'https://lucide.dev/', 'https://lucide.dev/')
  returning id
)
insert into fixture_ids select 'item', id from i;

insert into public.item_tags (user_id, item_id, tag_id)
values (
  auth.uid(),
  (select id from fixture_ids where label = 'item'),
  (select id from fixture_ids where label = 'icones_acento')
);

update public.tags set name = 'Iconografia'
where id = (select id from fixture_ids where label = 'icones_acento');

select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'icones_acento')),
  'iconografia', 'rename muda o slug e mantém o mesmo id'
);
select is(
  (select count(*)::int from public.item_tags
   where tag_id = (select id from fixture_ids where label = 'icones_acento')),
  1, 'rename não toca associações'
);

update public.tags set name = 'icones'
where id = (select id from fixture_ids where label = 'icones_sem_acento');

select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'icones_sem_acento')),
  'icones-2', 'rename que não muda a base preserva o slug (e a URL)'
);

-- 25-26. Reparent para um pai onde o slug já existe.
with t as (
  insert into public.tags (user_id, name, color_token)
  values (auth.uid(), 'UI', 'lime') returning id
)
insert into fixture_ids select 'ui', id from t;

insert into public.tags (user_id, parent_id, name, color_token)
values (auth.uid(), (select id from fixture_ids where label = 'ui'), 'Iconografía', 'lime');

with t as (
  insert into public.tags (user_id, parent_id, name, color_token)
  values (auth.uid(), (select id from fixture_ids where label = 'icones_acento'), 'Animados', 'lime')
  returning id
)
insert into fixture_ids select 'animados', id from t;

update public.tags set parent_id = (select id from fixture_ids where label = 'ui')
where id = (select id from fixture_ids where label = 'icones_acento');

select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'icones_acento')),
  'iconografia-2', 'mover para pai com o slug ocupado ganha sufixo em vez de falhar'
);
select is(
  (select slug from public.tags where id = (select id from fixture_ids where label = 'animados')),
  'animados', 'descendente não é reescrito: o caminho dele é derivado'
);

-- 27. Colisão de nome resolvida por delete_tag_reparent_children.
with t as (
  insert into public.tags (user_id, name, color_token)
  values (auth.uid(), 'Temp', 'lime') returning id
)
insert into fixture_ids select 'temp', id from t;

insert into public.tags (user_id, parent_id, name, color_token)
values (auth.uid(), (select id from fixture_ids where label = 'temp'), 'Design', 'lime');

select public.delete_tag_reparent_children((select id from fixture_ids where label = 'temp'));

select is(
  (select slug from public.tags where name = 'Design (1)'),
  'design-1', 'filho renomeado pela exclusão do pai recebe slug do nome novo'
);

-- 28-30. tags_with_ancestors e isolamento entre usuários.
select is(
  (select count(*)::int from public.tags_with_ancestors(
    array[(select id from fixture_ids where label = 'animados')]
  )),
  3, 'tags_with_ancestors devolve a tag e toda a cadeia de ancestrais'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.tags_with_ancestors(
    array[(select id from fixture_ids where label = 'animados')]
  )),
  0, 'tags_with_ancestors não enxerga tags de outro usuário'
);
select is(
  (select count(*)::int from public.tags where slug = 'iconografia-2'),
  0, 'busca por slug não enxerga tags de outro usuário'
);

-- 31-34. Restauração de backup: dica de slug preservada quando é forma
-- válida do nome; ausente ou arbitrária cai no derivado.
select tests.authenticate_as((select id from fixture_ids where label = 'user_c'));

select * from public.import_library_backup(
  $json$[
    {"key": "cccccccc-0000-4000-8000-000000000001", "parentKey": null,
     "name": "Design", "colorToken": "lime", "description": null, "createdAt": null},
    {"key": "cccccccc-0000-4000-8000-000000000002",
     "parentKey": "cccccccc-0000-4000-8000-000000000001",
     "name": "Ícones", "slug": "icones-2", "colorToken": "lime",
     "description": null, "createdAt": null},
    {"key": "cccccccc-0000-4000-8000-000000000003",
     "parentKey": "cccccccc-0000-4000-8000-000000000001",
     "name": "Icones", "slug": "icones", "colorToken": "lime",
     "description": null, "createdAt": null},
    {"key": "cccccccc-0000-4000-8000-000000000004",
     "parentKey": "cccccccc-0000-4000-8000-000000000001",
     "name": "Arquivo", "slug": "admin", "colorToken": "lime",
     "description": null, "createdAt": null}
  ]$json$::jsonb,
  '[]'::jsonb
);

select is((select slug from public.tags where name = 'Ícones'), 'icones-2', 'backup preserva slug com sufixo');
select is((select slug from public.tags where name = 'Design'), 'design', 'backup antigo sem slug deriva do nome');
select is((select slug from public.tags where name = 'Icones'), 'icones', 'backup preserva slug base');
select is((select slug from public.tags where name = 'Arquivo'), 'arquivo', 'backup com slug arbitrário cai no derivado');

-- 35-36. Importação de favoritos passa pela mesma regra.
select * from public.import_browser_bookmarks(
  $json$[
    {"key": "f1", "parentKey": null, "name": "Favoritos"},
    {"key": "f2", "parentKey": "f1", "name": "Ícones"},
    {"key": "f3", "parentKey": "f1", "name": "Icones"}
  ]$json$::jsonb,
  '[]'::jsonb
);

select is(
  (select array_agg(c.slug order by c.slug) from public.tags c
   join public.tags p on p.id = c.parent_id
   where p.name = 'Favoritos'),
  array['icones', 'icones-2'],
  'pastas importadas recebem slug e colisões pós-normalização ganham sufixo'
);
select is(
  (select count(*)::int from public.tags c
   join public.tags p on p.id = c.parent_id
   where p.name = 'Favoritos' and p.parent_id is null),
  2, 'hierarquia das pastas importadas continua correta'
);

-- 37. Nenhuma tag sem slug.
select col_not_null('public', 'tags', 'slug', 'slug é obrigatório');

select * from finish();

rollback;

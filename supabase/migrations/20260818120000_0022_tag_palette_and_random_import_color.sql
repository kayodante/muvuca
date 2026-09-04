-- Dois assuntos, uma mudança só: a paleta de tags cresce de 12 para 29 tokens
-- e a cor de uma pasta importada passa a ser sorteada aqui dentro, no insert,
-- em vez de viajar do cliente até o banco.
--
-- A 0021 resolvia o mesmo problema (pastas importadas nasciam todas 'stone')
-- deixando o parser escolher a cor e carregando essa escolha por um campo novo
-- no tipo, no schema Zod e no payload jsonb. Isso acoplou a paleta em
-- TypeScript a este check constraint sem nada ligando as duas listas: um token
-- novo do lado do TypeScript compilava, passava nos testes, e só aparecia como
-- importação quebrada para o usuário cujo nome de pasta caísse nele. A escolha
-- volta para a linha que cria a tag.
--
-- Reimportar continua não embaralhando cores: quando a tag já existe, ela é
-- encontrada pelo nome e o insert nem roda. É esse mecanismo que garante a
-- estabilidade, não a forma como a cor é escolhida.
--
-- `create or replace` republica o corpo inteiro porque Postgres não altera uma
-- função em partes. Só três coisas mudam em relação à 0021: a declaração de
-- v_pool, a coluna "colorToken" que sai do jsonb_to_recordset, e a expressão
-- de cor no insert.

-- 17 tokens novos; nenhum sai, então nenhuma linha existente vira inválida.
-- lib/tags/__tests__/palette-sync.test.ts falha se esta lista divergir de
-- TAG_COLOR_TOKENS em lib/validation/tag.ts.
alter table public.tags drop constraint tags_color_token_allowed;

alter table public.tags add constraint tags_color_token_allowed check (color_token in (
  'lime', 'chartreuse', 'yellow', 'amber', 'orange', 'peach', 'terracotta',
  'brown', 'red', 'rose', 'coral', 'pink', 'fuchsia', 'purple', 'lavender',
  'violet', 'indigo', 'periwinkle', 'blue', 'sky', 'cyan', 'aqua', 'teal',
  'emerald', 'mint', 'green', 'slate', 'zinc', 'stone'
));

create or replace function public.import_browser_bookmarks(p_tags jsonb, p_items jsonb)
returns table (items_imported integer, tags_created integer, associations_created integer)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_tag record;
  v_item record;
  v_parent_id uuid;
  v_tag_id uuid;
  v_item_id uuid;
  v_tag_ids jsonb := '{}'::jsonb;
  -- Os três neutros (slate, zinc, stone) ficam de fora: uma biblioteca
  -- importada inteira em cinza é exatamente o problema que isto resolve.
  -- Continuam disponíveis na seleção manual.
  v_pool constant text[] := array[
    'lime', 'chartreuse', 'yellow', 'amber', 'orange', 'peach', 'terracotta',
    'brown', 'red', 'rose', 'coral', 'pink', 'fuchsia', 'purple', 'lavender',
    'violet', 'indigo', 'periwinkle', 'blue', 'sky', 'cyan', 'aqua', 'teal',
    'emerald', 'mint', 'green'
  ];
begin
  if auth.uid() is null or jsonb_typeof(p_tags) <> 'array' or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_tags) > 5000 or jsonb_array_length(p_items) > 500 then
    raise exception 'importação inválida';
  end if;

  items_imported := 0;
  tags_created := 0;
  associations_created := 0;

  for v_tag in select * from jsonb_to_recordset(p_tags) as x(key text, "parentKey" text, name text) loop
    v_parent_id := null;
    if v_tag."parentKey" is not null then
      v_parent_id := (v_tag_ids ->> v_tag."parentKey")::uuid;
      if v_parent_id is null then raise exception 'hierarquia de pastas inválida'; end if;
    end if;
    select id into v_tag_id from public.tags
      where parent_id is not distinct from v_parent_id and name_normalized = lower(btrim(v_tag.name));
    if v_tag_id is null then
      insert into public.tags (user_id, parent_id, name, color_token)
      values (
        (select auth.uid()), v_parent_id, v_tag.name,
        v_pool[1 + floor(random() * array_length(v_pool, 1))::int]
      )
      on conflict do nothing returning id into v_tag_id;
      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where parent_id is not distinct from v_parent_id and name_normalized = lower(btrim(v_tag.name));
      else
        tags_created := tags_created + 1;
      end if;
    end if;
    v_tag_ids := v_tag_ids || jsonb_build_object(v_tag.key, v_tag_id);
  end loop;

  for v_item in select * from jsonb_to_recordset(p_items) as x(title text, url text, "normalizedUrl" text, "tagKey" text) loop
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values ((select auth.uid()), 'link', v_item.title, v_item.url, v_item."normalizedUrl")
    on conflict do nothing returning id into v_item_id;

    if v_item_id is null then
      -- O link já existe para este usuário. A leitura é escopada por RLS e
      -- pelo user_id derivado da sessão -- nunca por dado vindo do payload --
      -- e casa com o índice parcial library_items_unique_link_per_user.
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'link'
          and normalized_url = v_item."normalizedUrl";
      -- Só acontece em corrida com outra transação. Pular o item é preferível
      -- a abortar a importação inteira do usuário.
      if v_item_id is null then continue; end if;
    else
      items_imported := items_imported + 1;
    end if;

    if v_item."tagKey" is not null then
      v_tag_id := (v_tag_ids ->> v_item."tagKey")::uuid;
      if v_tag_id is null then raise exception 'pasta do favorito inválida'; end if;
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, v_tag_id)
      on conflict do nothing;
      if found then associations_created := associations_created + 1; end if;
    end if;
  end loop;

  return next;
end;
$$;

grant execute on function public.import_browser_bookmarks(jsonb, jsonb) to authenticated;

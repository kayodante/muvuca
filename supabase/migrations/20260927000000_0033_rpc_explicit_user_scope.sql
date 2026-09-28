-- AAA-82: as RPCs de escrita passam a escopar por usuário explicitamente, em
-- vez de depender só do RLS para isso.
--
-- As três são security invoker e as tabelas têm force row level security,
-- então hoje é seguro. O risco é de manutenção: convertida para security
-- definer, cada SELECT abaixo passaria a enxergar as linhas de todo mundo e o
-- erro seria silencioso -- a importação reusaria a tag ou o prompt de outra
-- pessoa, e set_item_tags apagaria as associações do item de outra pessoa.
-- supabase/tests/16_rpc_user_scope.sql prova isso com o RLS desligado.
--
-- Cada corpo é o vivo (0022, 0031 e 0010); a única mudança é
-- `and user_id = (select auth.uid())` em cada leitura ou delete que antes
-- confiava no RLS. user_id é a primeira coluna dos índices únicos de tags e
-- de library_items, então o filtro não piora nenhum plano.

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
      where user_id = (select auth.uid())
        and parent_id is not distinct from v_parent_id and name_normalized = lower(btrim(v_tag.name));
    if v_tag_id is null then
      insert into public.tags (user_id, parent_id, name, color_token)
      values (
        (select auth.uid()), v_parent_id, v_tag.name,
        v_pool[1 + floor(random() * array_length(v_pool, 1))::int]
      )
      on conflict do nothing returning id into v_tag_id;
      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where user_id = (select auth.uid())
            and parent_id is not distinct from v_parent_id and name_normalized = lower(btrim(v_tag.name));
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

create or replace function public.import_library_backup(p_tags jsonb, p_items jsonb)
returns table (items_imported integer, tags_created integer, duplicates_ignored integer)
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
  v_tag_key text;
  v_tag_ids jsonb := '{}'::jsonb;
  v_is_new boolean;
begin
  if auth.uid() is null
     or jsonb_typeof(p_tags) <> 'array'
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_tags) > 5000
     or jsonb_array_length(p_items) > 20000 then
    raise exception 'restauração inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  items_imported := 0;
  tags_created := 0;
  duplicates_ignored := 0;

  for v_tag in
    select * from jsonb_to_recordset(p_tags)
      as x(key text, "parentKey" text, name text, slug text, "colorToken" text,
           description text, "createdAt" timestamptz)
  loop
    v_parent_id := null;
    if v_tag."parentKey" is not null then
      v_parent_id := (v_tag_ids ->> v_tag."parentKey")::uuid;
      if v_parent_id is null then
        raise exception 'hierarquia de tags inválida';
      end if;
    end if;

    select id into v_tag_id from public.tags
      where user_id = (select auth.uid())
        and parent_id is not distinct from v_parent_id
        and name_normalized = lower(btrim(v_tag.name));

    if v_tag_id is null then
      insert into public.tags (
        user_id, parent_id, name, slug, color_token, description, created_at
      )
      values (
        (select auth.uid()), v_parent_id, v_tag.name, v_tag.slug,
        coalesce(v_tag."colorToken", 'stone'), v_tag.description,
        coalesce(v_tag."createdAt", now())
      )
      on conflict do nothing returning id into v_tag_id;

      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where user_id = (select auth.uid())
            and parent_id is not distinct from v_parent_id
            and name_normalized = lower(btrim(v_tag.name));
      else
        tags_created := tags_created + 1;
      end if;
    end if;

    v_tag_ids := v_tag_ids || jsonb_build_object(v_tag.key, v_tag_id);
  end loop;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(type text, title text, url text, "normalizedUrl" text,
           content text, description text, "createdAt" timestamptz,
           language text, "tagKeys" jsonb)
  loop
    v_is_new := false;

    if v_item.type = 'link' then
      insert into public.library_items (
        user_id, type, title, url, normalized_url, description, created_at
      )
      values (
        (select auth.uid()), 'link', v_item.title, v_item.url,
        v_item."normalizedUrl", v_item.description,
        coalesce(v_item."createdAt", now())
      )
      on conflict do nothing returning id into v_item_id;

      if v_item_id is null then
        select id into v_item_id from public.library_items
          where user_id = (select auth.uid())
            and type = 'link' and normalized_url = v_item."normalizedUrl";
      else
        v_is_new := true;
      end if;
    elsif v_item.type = 'code_component' then
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'code_component'
          and title = v_item.title
          and content is not distinct from v_item.content
          and normalized_url is not distinct from v_item."normalizedUrl";

      if v_item_id is null then
        insert into public.library_items (
          user_id, type, title, url, normalized_url, content, description, language, created_at
        )
        values (
          (select auth.uid()), 'code_component', v_item.title, v_item.url,
          v_item."normalizedUrl", v_item.content, v_item.description,
          v_item.language,
          coalesce(v_item."createdAt", now())
        )
        returning id into v_item_id;
        v_is_new := true;
      end if;
    else
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'prompt'
          and title = v_item.title
          and content is not distinct from v_item.content;

      if v_item_id is null then
        insert into public.library_items (
          user_id, type, title, content, description, created_at
        )
        values (
          (select auth.uid()), 'prompt', v_item.title, v_item.content,
          v_item.description, coalesce(v_item."createdAt", now())
        )
        returning id into v_item_id;
        v_is_new := true;
      end if;
    end if;

    if v_is_new then
      items_imported := items_imported + 1;
    else
      duplicates_ignored := duplicates_ignored + 1;
    end if;

    for v_tag_key in
      select jsonb_array_elements_text(coalesce(v_item."tagKeys", '[]'::jsonb))
    loop
      v_tag_id := (v_tag_ids ->> v_tag_key)::uuid;
      if v_tag_id is null then
        raise exception 'tag do item ausente no lote';
      end if;
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, v_tag_id)
      on conflict do nothing;
    end loop;
  end loop;

  return next;
end;
$$;

create or replace function public.set_item_tags(p_item_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_requested_count integer := cardinality(p_tag_ids);
  v_visible_tag_count integer;
begin
  if v_requested_count is null or v_requested_count > 100 then
    raise exception 'quantidade de tags inválida';
  end if;

  if v_requested_count <> cardinality(array(select distinct unnest(p_tag_ids))) then
    raise exception 'tags duplicadas não são permitidas';
  end if;

  -- Esta checagem e a contagem abaixo são a autorização inteira da função:
  -- "o item é seu?" e "as tags são suas?".
  perform 1
  from public.library_items
  where id = p_item_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'item não encontrado';
  end if;

  select count(*) into v_visible_tag_count
  from public.tags
  where id = any(p_tag_ids)
    and user_id = (select auth.uid());

  if v_visible_tag_count <> v_requested_count then
    raise exception 'uma ou mais tags não estão disponíveis';
  end if;

  delete from public.item_tags
  where item_id = p_item_id
    and user_id = (select auth.uid());

  insert into public.item_tags (user_id, item_id, tag_id)
  select (select auth.uid()), p_item_id, tag_id
  from unnest(p_tag_ids) as tag_id;
end;
$$;

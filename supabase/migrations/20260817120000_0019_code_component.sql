-- Suporte ao tipo de item code_component.
--
-- code_component armazena snippets/componentes de código com conteúdo obrigatório
-- (até 100.000 caracteres) e URL de origem opcional (se informada, deve ser http(s)
-- com até 4096 caracteres e normalized_url correspondente).

-- 1. Adiciona valor ao enum item_type
alter type public.item_type add value if not exists 'code_component';
commit;
begin;

-- 2. Atualiza a constraint de integridade do payload dos itens
alter table public.library_items drop constraint if exists library_items_type_payload;
alter table public.library_items add constraint library_items_type_payload check (
  (
    type = 'link'
    and url is not null
    and char_length(url) between 1 and 4096
    and url ~* '^https?://'
    and normalized_url is not null
    and char_length(normalized_url) between 1 and 4096
    and normalized_url ~* '^https?://'
    and content is null
  )
  or
  (
    type = 'prompt'
    and content is not null
    and char_length(content) between 1 and 100000
    and url is null
    and normalized_url is null
  )
  or
  (
    type = 'code_component'
    and content is not null
    and char_length(content) between 1 and 100000
    and (
      (url is null and normalized_url is null)
      or
      (
        url is not null
        and char_length(url) between 1 and 4096
        and url ~* '^https?://'
        and normalized_url is not null
        and char_length(normalized_url) between 1 and 4096
        and normalized_url ~* '^https?://'
      )
    )
  )
);

-- 3. Atualiza search_library para projetar content_preview para prompt e code_component
create or replace function public.search_library(
  p_query text default null,
  p_tag_id uuid default null,
  p_include_descendants boolean default true,
  p_types public.item_type[] default null,
  p_sort text default 'newest',
  p_cursor jsonb default null,
  p_limit int default 49
)
returns table (
  id uuid,
  type public.item_type,
  title text,
  description text,
  url text,
  content_preview text,
  tag_ids uuid[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $fn$
declare
  v_query text := nullif(btrim(p_query), '');
  v_tsquery tsquery;
  v_pattern text;
  v_cursor_timestamp timestamptz;
  v_cursor_title text;
  v_cursor_id uuid;
  v_cursor_dir text;
  v_max_limit constant int := 49; -- SEARCH_LIBRARY_MAX_LIMIT
  v_limit int := coalesce(p_limit, v_max_limit);
  v_descending boolean;
  v_key_column text;
  v_key_type text;
  v_order text;
  v_operator text;
  v_sql text;
begin
  if p_sort not in ('newest', 'oldest', 'title_asc', 'title_desc', 'updated') then
    raise exception 'ordenação inválida';
  end if;

  if v_limit < 1 or v_limit > v_max_limit then
    raise exception 'limite inválido';
  end if;

  if v_query is not null then
    v_tsquery := websearch_to_tsquery('simple'::regconfig, v_query);
    v_pattern := '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  end if;

  begin
    v_cursor_id := (p_cursor ->> 'id')::uuid;
    v_cursor_dir := coalesce(p_cursor ->> 'dir', 'next');
    if p_sort in ('newest', 'oldest', 'updated') then
      v_cursor_timestamp := (p_cursor ->> 'timestamp')::timestamptz;
    else
      v_cursor_title := p_cursor ->> 'title';
    end if;
  exception when others then
    v_cursor_id := null;
    v_cursor_timestamp := null;
    v_cursor_title := null;
    v_cursor_dir := 'next';
  end;

  if v_cursor_dir not in ('next', 'prev') then
    v_cursor_dir := 'next';
  end if;

  -- Allowlist -> identificador. p_sort já foi validado, então estes três
  -- literais são os únicos valores possíveis; nada aqui vem do cliente.
  v_key_column := case
    when p_sort in ('newest', 'oldest') then 'created_at'
    when p_sort = 'updated' then 'updated_at'
    else 'title'
  end;

  v_key_type := case when v_key_column = 'title' then 'text' else 'timestamptz' end;

  -- Direção natural do sort, invertida quando a página é caminhada para trás.
  v_descending := p_sort in ('newest', 'updated', 'title_desc');

  if v_cursor_dir = 'prev' and v_cursor_id is not null then
    v_descending := not v_descending;
  end if;

  v_order := case when v_descending then 'desc' else 'asc' end;
  v_operator := case when v_descending then '<' else '>' end;

  v_sql := $sql$
    with recursive descendant_tags as (
      select t.id, 1 as depth
      from public.tags t
      where t.id = $2

      union all

      select child.id, parent.depth + 1
      from public.tags child
      join descendant_tags parent on child.parent_id = parent.id
      where $3 and parent.depth < 6
    ) cycle id set is_cycle using path,
    scoped_tag_ids as (
      select dt.id from descendant_tags dt where not dt.is_cycle
    )
    select li.id, li.type, li.title, li.description, li.url,
      case when li.type in ('prompt', 'code_component') then left(li.content, 2000) end,
      coalesce((select array_agg(it.tag_id order by it.tag_id)
        from public.item_tags it
        where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
      li.created_at, li.updated_at
    from public.library_items li
    where ($4::public.item_type[] is null or li.type = any($4))
      and ($1::text is null or li.search_vector @@ $5::tsquery
        or li.title ilike $6 escape E'\\'
        or coalesce(li.url, '') ilike $6 escape E'\\')
      and ($2::uuid is null or exists (
        select 1 from public.item_tags it
        where it.item_id = li.id and it.user_id = li.user_id
          and it.tag_id in (select sti.id from scoped_tag_ids sti)))
  $sql$
    || ' and ($8::uuid is null or (li.' || quote_ident(v_key_column) || ', li.id) '
    || v_operator || ' ($9::' || v_key_type || ', $8))'
    || ' order by li.' || quote_ident(v_key_column) || ' ' || v_order
    || ', li.id ' || v_order
    || ' limit $7';

  if v_key_column = 'title' then
    return query execute v_sql
      using v_query, p_tag_id, p_include_descendants, p_types,
            v_tsquery, v_pattern, v_limit, v_cursor_id, v_cursor_title;
  else
    return query execute v_sql
      using v_query, p_tag_id, p_include_descendants, p_types,
            v_tsquery, v_pattern, v_limit, v_cursor_id, v_cursor_timestamp;
  end if;
end;
$fn$;

grant execute on function public.search_library(text, uuid, boolean, public.item_type[], text, jsonb, int) to authenticated;

-- 4. Atualiza import_library_backup para suportar code_component
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

  -- Serializa restaurações concorrentes do mesmo usuário pela duração desta
  -- transação; liberado automaticamente no commit ou rollback.
  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  items_imported := 0;
  tags_created := 0;
  duplicates_ignored := 0;

  for v_tag in
    select * from jsonb_to_recordset(p_tags)
      as x(key text, "parentKey" text, name text, "colorToken" text,
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
      where parent_id is not distinct from v_parent_id
        and name_normalized = lower(btrim(v_tag.name));

    if v_tag_id is null then
      insert into public.tags (
        user_id, parent_id, name, color_token, description, created_at
      )
      values (
        (select auth.uid()), v_parent_id, v_tag.name,
        coalesce(v_tag."colorToken", 'stone'), v_tag.description,
        coalesce(v_tag."createdAt", now())
      )
      on conflict do nothing returning id into v_tag_id;

      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where parent_id is not distinct from v_parent_id
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
           "tagKeys" jsonb)
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
          where type = 'link' and normalized_url = v_item."normalizedUrl";
      else
        v_is_new := true;
      end if;
    elsif v_item.type = 'code_component' then
      select id into v_item_id from public.library_items
        where type = 'code_component'
          and title = v_item.title
          and content is not distinct from v_item.content
          and normalized_url is not distinct from v_item."normalizedUrl";

      if v_item_id is null then
        insert into public.library_items (
          user_id, type, title, url, normalized_url, content, description, created_at
        )
        values (
          (select auth.uid()), 'code_component', v_item.title, v_item.url,
          v_item."normalizedUrl", v_item.content, v_item.description,
          coalesce(v_item."createdAt", now())
        )
        returning id into v_item_id;
        v_is_new := true;
      end if;
    else
      -- Sem índice único para conflitar: verifica antes de inserir. A
      -- janela entre a leitura e a escrita é fechada pelo advisory lock
      -- acima, não por esta consulta isoladamente.
      select id into v_item_id from public.library_items
        where type = 'prompt'
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

    -- Associações de tag são reconciliadas tanto para item novo quanto para
    -- duplicata: um item já existente pode ganhar tags novas do backup, sem
    -- que seus próprios campos sejam sobrescritos (política não destrutiva).
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

grant execute on function public.import_library_backup(jsonb, jsonb) to authenticated;

-- 5. Índice para apoiar deduplicação de code_component no backup
create index if not exists library_items_code_component_dedupe
  on public.library_items (user_id, title)
  where type = 'code_component';

-- AAA-106: suporte a linguagem de sintaxe em itens code_component.

alter table public.library_items
  add column language text,
  add constraint library_items_language_allowed check (
    language is null or language in (
      'typescript','javascript','tsx','html','css','python',
      'sql','json','bash','go','rust','markdown','yaml'
    )
  ),
  add constraint library_items_language_only_code check (
    language is null or type = 'code_component'
  );

-- RPCs com parâmetro novo precisam drop+create; as grants precisam ser reemitidas.

drop function public.create_library_item(public.item_type, text, text, text, text, text, uuid[]);

drop function public.update_library_item(uuid, public.item_type, text, text, text, text, text, uuid[]);

create function public.create_library_item(
  p_type public.item_type,
  p_title text,
  p_url text,
  p_normalized_url text,
  p_content text,
  p_description text,
  p_tag_ids uuid[],
  p_language text default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_item_id uuid;
begin
  insert into public.library_items (
    user_id, type, title, url, normalized_url, content, description, language
  )
  values (
    (select auth.uid()), p_type, p_title, p_url, p_normalized_url,
    p_content, p_description, p_language
  )
  returning id into v_item_id;

  perform public.set_item_tags(v_item_id, p_tag_ids);
  return v_item_id;
end;
$$;

create function public.update_library_item(
  p_item_id uuid,
  p_type public.item_type,
  p_title text,
  p_url text,
  p_normalized_url text,
  p_content text,
  p_description text,
  p_tag_ids uuid[],
  p_language text default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.library_items
  set
    type = p_type,
    title = p_title,
    url = p_url,
    normalized_url = p_normalized_url,
    content = p_content,
    description = p_description,
    language = p_language
  where id = p_item_id;

  if not found then
    raise exception 'item não encontrado';
  end if;

  perform public.set_item_tags(p_item_id, p_tag_ids);
end;
$$;

-- RETURNS TABLE nova com `language` pede drop+create.
drop function public.search_library(text, uuid, boolean, public.item_type[], text, jsonb, int);

create function public.search_library(
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
  language text,
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

  -- Allowlist -> identificador; p_sort já validado.
  v_key_column := case
    when p_sort in ('newest', 'oldest') then 'created_at'
    when p_sort = 'updated' then 'updated_at'
    else 'title'
  end;

  v_key_type := case when v_key_column = 'title' then 'text' else 'timestamptz' end;
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
      li.language,
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

-- import_library_backup: ler `language` de itens code_component.
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

grant execute on function public.create_library_item(public.item_type, text, text, text, text, text, uuid[], text) to authenticated;
grant execute on function public.update_library_item(uuid, public.item_type, text, text, text, text, text, uuid[], text) to authenticated;
grant execute on function public.search_library(text, uuid, boolean, public.item_type[], text, jsonb, int) to authenticated;

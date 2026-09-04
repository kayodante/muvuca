-- Indexed discovery query for the library.
--
-- The tag condition is a semi-join: an item tagged with two descendants is
-- still returned once, while every supported sort and keyset cursor remain
-- available.
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
  tag_ids uuid[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_tsquery tsquery;
  v_cursor_timestamp timestamptz;
  v_cursor_title text;
  v_cursor_id uuid;
  v_limit int := greatest(1, least(coalesce(p_limit, 49), 49));
begin
  if p_sort not in ('newest', 'oldest', 'title_asc', 'title_desc', 'updated') then
    raise exception 'ordenação inválida';
  end if;

  if v_query is not null then
    v_tsquery := websearch_to_tsquery('simple'::regconfig, v_query);
  end if;

  begin
    v_cursor_id := (p_cursor ->> 'id')::uuid;
    if p_sort in ('newest', 'oldest', 'updated') then
      v_cursor_timestamp := (p_cursor ->> 'timestamp')::timestamptz;
    else
      v_cursor_title := p_cursor ->> 'title';
    end if;
  exception when others then
    v_cursor_id := null;
    v_cursor_timestamp := null;
    v_cursor_title := null;
  end;

  if p_sort = 'newest' then
    return query
      with recursive descendant_tags as (
        select t.id, 1 as depth
        from public.tags t
        where t.id = p_tag_id

        union all

        select child.id, parent.depth + 1
        from public.tags child
        join descendant_tags parent on child.parent_id = parent.id
        where p_include_descendants and parent.depth < 6
      ) cycle id set is_cycle using path,
      scoped_tag_ids as (
        select dt.id from descendant_tags dt where not dt.is_cycle
      )
      select li.id, li.type, li.title, li.description, li.url,
        case when li.type = 'prompt' then left(li.content, 2000) end,
        coalesce((select array_agg(it.tag_id order by it.tag_id)
          from public.item_tags it
          where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
        li.created_at, li.updated_at
      from public.library_items li
      where (p_types is null or li.type = any(p_types))
        and (v_query is null or li.search_vector @@ v_tsquery
          or li.title ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
          or coalesce(li.url, '') ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\')
        and (p_tag_id is null or exists (
          select 1 from public.item_tags it
          where it.item_id = li.id and it.user_id = li.user_id
            and it.tag_id in (select sti.id from scoped_tag_ids sti)))
        and (v_cursor_id is null or (li.created_at, li.id) < (v_cursor_timestamp, v_cursor_id))
      order by li.created_at desc, li.id desc
      limit v_limit;
  elsif p_sort = 'oldest' then
    return query
      with recursive descendant_tags as (
        select t.id, 1 as depth from public.tags t where t.id = p_tag_id
        union all
        select child.id, parent.depth + 1 from public.tags child
        join descendant_tags parent on child.parent_id = parent.id
        where p_include_descendants and parent.depth < 6
      ) cycle id set is_cycle using path,
      scoped_tag_ids as (select dt.id from descendant_tags dt where not dt.is_cycle)
      select li.id, li.type, li.title, li.description, li.url,
        case when li.type = 'prompt' then left(li.content, 2000) end,
        coalesce((select array_agg(it.tag_id order by it.tag_id) from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
        li.created_at, li.updated_at
      from public.library_items li
      where (p_types is null or li.type = any(p_types))
        and (v_query is null or li.search_vector @@ v_tsquery or li.title ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' or coalesce(li.url, '') ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\')
        and (p_tag_id is null or exists (select 1 from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id and it.tag_id in (select sti.id from scoped_tag_ids sti)))
        and (v_cursor_id is null or (li.created_at, li.id) > (v_cursor_timestamp, v_cursor_id))
      order by li.created_at asc, li.id asc
      limit v_limit;
  elsif p_sort = 'updated' then
    return query
      with recursive descendant_tags as (
        select t.id, 1 as depth from public.tags t where t.id = p_tag_id
        union all
        select child.id, parent.depth + 1 from public.tags child
        join descendant_tags parent on child.parent_id = parent.id
        where p_include_descendants and parent.depth < 6
      ) cycle id set is_cycle using path,
      scoped_tag_ids as (select dt.id from descendant_tags dt where not dt.is_cycle)
      select li.id, li.type, li.title, li.description, li.url,
        case when li.type = 'prompt' then left(li.content, 2000) end,
        coalesce((select array_agg(it.tag_id order by it.tag_id) from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
        li.created_at, li.updated_at
      from public.library_items li
      where (p_types is null or li.type = any(p_types))
        and (v_query is null or li.search_vector @@ v_tsquery or li.title ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' or coalesce(li.url, '') ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\')
        and (p_tag_id is null or exists (select 1 from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id and it.tag_id in (select sti.id from scoped_tag_ids sti)))
        and (v_cursor_id is null or (li.updated_at, li.id) < (v_cursor_timestamp, v_cursor_id))
      order by li.updated_at desc, li.id desc
      limit v_limit;
  elsif p_sort = 'title_asc' then
    return query
      with recursive descendant_tags as (
        select t.id, 1 as depth from public.tags t where t.id = p_tag_id
        union all
        select child.id, parent.depth + 1 from public.tags child
        join descendant_tags parent on child.parent_id = parent.id
        where p_include_descendants and parent.depth < 6
      ) cycle id set is_cycle using path,
      scoped_tag_ids as (select dt.id from descendant_tags dt where not dt.is_cycle)
      select li.id, li.type, li.title, li.description, li.url,
        case when li.type = 'prompt' then left(li.content, 2000) end,
        coalesce((select array_agg(it.tag_id order by it.tag_id) from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
        li.created_at, li.updated_at
      from public.library_items li
      where (p_types is null or li.type = any(p_types))
        and (v_query is null or li.search_vector @@ v_tsquery or li.title ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' or coalesce(li.url, '') ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\')
        and (p_tag_id is null or exists (select 1 from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id and it.tag_id in (select sti.id from scoped_tag_ids sti)))
        and (v_cursor_id is null or (li.title, li.id) > (v_cursor_title, v_cursor_id))
      order by li.title asc, li.id asc
      limit v_limit;
  else
    return query
      with recursive descendant_tags as (
        select t.id, 1 as depth from public.tags t where t.id = p_tag_id
        union all
        select child.id, parent.depth + 1 from public.tags child
        join descendant_tags parent on child.parent_id = parent.id
        where p_include_descendants and parent.depth < 6
      ) cycle id set is_cycle using path,
      scoped_tag_ids as (select dt.id from descendant_tags dt where not dt.is_cycle)
      select li.id, li.type, li.title, li.description, li.url,
        case when li.type = 'prompt' then left(li.content, 2000) end,
        coalesce((select array_agg(it.tag_id order by it.tag_id) from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id), '{}'::uuid[]),
        li.created_at, li.updated_at
      from public.library_items li
      where (p_types is null or li.type = any(p_types))
        and (v_query is null or li.search_vector @@ v_tsquery or li.title ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' or coalesce(li.url, '') ilike '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\')
        and (p_tag_id is null or exists (select 1 from public.item_tags it where it.item_id = li.id and it.user_id = li.user_id and it.tag_id in (select sti.id from scoped_tag_ids sti)))
        and (v_cursor_id is null or (li.title, li.id) < (v_cursor_title, v_cursor_id))
      order by li.title desc, li.id desc
      limit v_limit;
  end if;
end;
$$;

grant execute on function public.search_library(text, uuid, boolean, public.item_type[], text, jsonb, int) to authenticated;

-- Elevate batch limits for browser bookmark imports to support up to 5,000 folders
-- and chunked item batches of up to 500 links per transaction.

create or replace function public.import_browser_bookmarks(p_tags jsonb, p_items jsonb)
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
  v_tag_ids jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or jsonb_typeof(p_tags) <> 'array' or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_tags) > 5000 or jsonb_array_length(p_items) > 500 then
    raise exception 'importação inválida';
  end if;

  items_imported := 0;
  tags_created := 0;
  duplicates_ignored := 0;

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
      values ((select auth.uid()), v_parent_id, v_tag.name, 'stone')
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
      duplicates_ignored := duplicates_ignored + 1;
      continue;
    end if;
    items_imported := items_imported + 1;
    if v_item."tagKey" is not null then
      v_tag_id := (v_tag_ids ->> v_item."tagKey")::uuid;
      if v_tag_id is null then raise exception 'pasta do favorito inválida'; end if;
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, v_tag_id);
    end if;
  end loop;
  return next;
end;
$$;

grant execute on function public.import_browser_bookmarks(jsonb, jsonb) to authenticated;

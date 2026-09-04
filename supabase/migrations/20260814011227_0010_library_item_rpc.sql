-- Item writes that also change tag associations must be atomic. These
-- functions are security invoker, so all reads and writes keep the caller's
-- RLS restrictions.

create function public.set_item_tags(p_item_id uuid, p_tag_ids uuid[])
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

  perform 1
  from public.library_items
  where id = p_item_id;

  if not found then
    raise exception 'item não encontrado';
  end if;

  select count(*) into v_visible_tag_count
  from public.tags
  where id = any(p_tag_ids);

  if v_visible_tag_count <> v_requested_count then
    raise exception 'uma ou mais tags não estão disponíveis';
  end if;

  delete from public.item_tags
  where item_id = p_item_id;

  insert into public.item_tags (user_id, item_id, tag_id)
  select (select auth.uid()), p_item_id, tag_id
  from unnest(p_tag_ids) as tag_id;
end;
$$;

create function public.create_library_item(
  p_type public.item_type,
  p_title text,
  p_url text,
  p_normalized_url text,
  p_content text,
  p_description text,
  p_tag_ids uuid[]
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
    user_id, type, title, url, normalized_url, content, description
  )
  values (
    (select auth.uid()), p_type, p_title, p_url, p_normalized_url,
    p_content, p_description
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
  p_tag_ids uuid[]
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
    description = p_description
  where id = p_item_id;

  if not found then
    raise exception 'item não encontrado';
  end if;

  perform public.set_item_tags(p_item_id, p_tag_ids);
end;
$$;

grant execute on function public.set_item_tags(uuid, uuid[]) to authenticated;
grant execute on function public.create_library_item(public.item_type, text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.update_library_item(uuid, public.item_type, text, text, text, text, text, uuid[]) to authenticated;

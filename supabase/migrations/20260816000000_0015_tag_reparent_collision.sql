-- Migration: 20260816000000_0015_tag_reparent_collision.sql
-- Description: Handle name collision when reparenting child tags on parent tag deletion.

create or replace function public.delete_tag_reparent_children(p_tag_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_parent_id uuid;
  v_child record;
  v_candidate_name text;
  v_counter int;
  v_suffix text;
  v_max_base_len int;
begin
  -- Fetch the target tag and verify it belongs to the current user (RLS-scoped)
  select user_id, parent_id into v_user_id, v_parent_id
  from public.tags
  where id = p_tag_id;

  if not found then
    raise exception 'tag não encontrada';
  end if;

  -- Lock user's tag hierarchy during deletion & reparenting to avoid concurrent conflicts
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Reparent direct children to v_parent_id, handling name collisions
  for v_child in
    select id, name
    from public.tags
    where parent_id = p_tag_id
    order by name, id
  loop
    v_candidate_name := v_child.name;
    v_counter := 1;

    -- Check if candidate name collides with an existing tag at target level
    while exists (
      select 1
      from public.tags
      where user_id = v_user_id
        and parent_id is not distinct from v_parent_id
        and id <> v_child.id
        and name_normalized = lower(btrim(v_candidate_name))
    ) loop
      v_suffix := ' (' || v_counter::text || ')';
      v_max_base_len := 80 - char_length(v_suffix);
      v_candidate_name := btrim(substring(v_child.name from 1 for v_max_base_len)) || v_suffix;
      v_counter := v_counter + 1;
    end loop;

    -- Apply update to reparent child and update name if collision occurred
    if v_candidate_name <> v_child.name then
      update public.tags
      set name = v_candidate_name,
          parent_id = v_parent_id
      where id = v_child.id;
    else
      update public.tags
      set parent_id = v_parent_id
      where id = v_child.id;
    end if;
  end loop;

  -- Remove item associations for the deleted tag
  delete from public.item_tags
  where tag_id = p_tag_id;

  -- Delete the tag itself
  delete from public.tags
  where id = p_tag_id;
end;
$$;

grant execute on function public.delete_tag_reparent_children(uuid) to authenticated;

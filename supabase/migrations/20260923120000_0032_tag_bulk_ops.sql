-- Migration: 20260923120000_0032_tag_bulk_ops.sql
-- Description: Atomic bulk move/delete for the /tags workspace (AAA-219).
--
-- Both functions are security invoker: RLS on public.tags is the only
-- authorization. A requested id the caller cannot see makes the visible
-- count fall short and raises 'tag não encontrada' -- the same "not found,
-- never forbidden" contract as delete_tag_reparent_children (0009/0015).
-- One call is one transaction: any failing tag rolls the whole batch back.
-- The 500 cap mirrors TAG_BULK_MAX in lib/validation/tag.ts.

create function public.move_tags(p_tag_ids uuid[], p_parent_id uuid default null)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_requested int;
  v_visible int;
  v_roots uuid[];
begin
  if p_tag_ids is null or cardinality(p_tag_ids) = 0 or cardinality(p_tag_ids) > 500 or array_position(p_tag_ids, null) is not null then
    raise exception 'lote de tags inválido';
  end if;

  -- Same per-user key as enforce_tag_hierarchy (0008): serializes this
  -- batch against any other hierarchy write of the caller.
  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  select count(distinct requested.id) into v_requested
  from unnest(p_tag_ids) as requested(id);

  select count(*) into v_visible
  from public.tags
  where id = any(p_tag_ids);

  if v_visible <> v_requested then
    raise exception 'tag não encontrada';
  end if;

  if p_parent_id is not null
     and not exists (select 1 from public.tags where id = p_parent_id) then
    raise exception 'tag não encontrada';
  end if;

  -- A tag selected together with one of its ancestors already moves with
  -- that ancestor; re-parenting it too would flatten the subtree.
  select array_agg(requested.id) into v_roots
  from (select distinct unnest(p_tag_ids) as id) as requested
  where not exists (
    select 1
    from public.tag_ancestors(requested.id) as ancestor
    where ancestor.id = any(p_tag_ids)
  );

  -- enforce_tag_hierarchy (0008) checks cycle and depth per row; the
  -- per-level unique indexes (0003) reject a name collision at the target
  -- with 23505. No automatic rename: moving is an explicit choice.
  update public.tags
  set parent_id = p_parent_id
  where id = any(v_roots);
end;
$$;

create function public.delete_tags_reparent_children(p_tag_ids uuid[])
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_requested int;
  v_visible int;
  v_tag_id uuid;
begin
  if p_tag_ids is null or cardinality(p_tag_ids) = 0 or cardinality(p_tag_ids) > 500 or array_position(p_tag_ids, null) is not null then
    raise exception 'lote de tags inválido';
  end if;

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  select count(distinct requested.id) into v_requested
  from unnest(p_tag_ids) as requested(id);

  select count(*) into v_visible
  from public.tags
  where id = any(p_tag_ids);

  if v_visible <> v_requested then
    raise exception 'tag não encontrada';
  end if;

  -- Every selected tag is about to be deleted; its name must not push a
  -- promoted child into a " (n)" rename. The id is a placeholder no one
  -- types: the UI never shows it, so a sibling already named exactly like it
  -- only exists on purpose -- and then the unique index rolls the whole
  -- batch back (nothing is lost), which is accepted.
  update public.tags
  set name = id::text
  where id = any(p_tag_ids);

  -- Deepest first. Every selected tag is deleted -- skipping a selected
  -- descendant would let it survive, promoted, the opposite of the request.
  -- Each deletion lifts its children one level, so an unselected tag under
  -- several deleted ancestors ends under the nearest surviving one.
  for v_tag_id in
    select requested.id
    from (select distinct unnest(p_tag_ids) as id) as requested
    order by (select count(*) from public.tag_ancestors(requested.id)) desc, requested.id
  loop
    perform public.delete_tag_reparent_children(v_tag_id);
  end loop;
end;
$$;

revoke execute on function public.move_tags(uuid[], uuid) from public, anon;
revoke execute on function public.delete_tags_reparent_children(uuid[]) from public, anon;
grant execute on function public.move_tags(uuid[], uuid) to authenticated;
grant execute on function public.delete_tags_reparent_children(uuid[]) to authenticated;

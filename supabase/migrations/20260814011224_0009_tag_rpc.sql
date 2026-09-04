-- Tag domain RPCs.
--
-- All three are `security invoker`: they run with the calling role's
-- privileges, so RLS on `public.tags`/`public.item_tags` is exactly as
-- effective inside these functions as it is in a direct query. A tag id
-- that does not exist, or belongs to another user, is indistinguishable
-- from RLS's point of view -- both simply produce no visible row -- which
-- is what keeps these functions from leaking cross-user existence.

create function public.tag_descendants(p_tag_id uuid)
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive descendants as (
    select id
    from public.tags
    where parent_id = p_tag_id

    union all

    select t.id
    from public.tags t
    join descendants d on t.parent_id = d.id
  )
  cycle id set is_cycle using path
  select id from descendants where not is_cycle;
$$;

-- depth counts hops from p_tag_id upward: 1 = immediate parent, 2 =
-- grandparent, etc. Callers building a breadcrumb order by depth desc to
-- get root-first order.
create function public.tag_ancestors(p_tag_id uuid)
returns table (id uuid, name text, depth int)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive ancestors as (
    select t.id, t.name, t.parent_id, 1 as depth
    from public.tags t
    where t.id = (select parent_id from public.tags where id = p_tag_id)

    union all

    select t.id, t.name, t.parent_id, a.depth + 1
    from public.tags t
    join ancestors a on t.id = a.parent_id
  )
  cycle id set is_cycle using path
  select id, name, depth from ancestors where not is_cycle;
$$;

-- Transactional tag deletion: direct children are
-- reparented to the deleted tag's own parent (root if it had none), then
-- item_tags rows for the deleted tag are removed, then the tag itself is
-- deleted. Items are never touched -- only their association with this one
-- tag. The reparenting UPDATE still goes through
-- enforce_tag_hierarchy()/0008, so a reparent that would somehow violate
-- depth is still rejected by the trigger rather than silently applied.
create function public.delete_tag_reparent_children(p_tag_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_parent_id uuid;
begin
  select parent_id into v_parent_id
  from public.tags
  where id = p_tag_id;

  if not found then
    raise exception 'tag não encontrada';
  end if;

  update public.tags
  set parent_id = v_parent_id
  where parent_id = p_tag_id;

  delete from public.item_tags
  where tag_id = p_tag_id;

  delete from public.tags
  where id = p_tag_id;
end;
$$;

-- `auto_expose_new_tables` is unset (supabase/config.toml), so new public
-- functions are not reachable through the Data API without an explicit
-- grant, matching the deny-by-default posture of 0007_rls.sql. `anon` gets
-- nothing; only `authenticated` can call these.
grant execute on function public.tag_descendants(uuid) to authenticated;
grant execute on function public.tag_ancestors(uuid) to authenticated;
grant execute on function public.delete_tag_reparent_children(uuid) to authenticated;

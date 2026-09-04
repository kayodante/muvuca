-- Tag rollup read model.
--
-- The recursive CTE starts with the selected tag, so direct associations and
-- any descendant association participate in the same result. The CYCLE guard
-- and depth bound keep this read safe even if data created outside the normal
-- hierarchy trigger is malformed.
--
-- `exists`, rather than a join to item_tags, is intentional: an item tagged
-- with two nodes in this subtree is still returned once, while the ordering
-- stays independent from deduplication.
create function public.get_tag_rollup_items(p_tag_id uuid)
returns table (
  id uuid,
  type public.item_type,
  title text,
  description text,
  url text,
  content text,
  tag_ids uuid[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive descendant_tags as (
    select id, 1 as depth
    from public.tags
    where id = p_tag_id

    union all

    select child.id, parent.depth + 1
    from public.tags child
    join descendant_tags parent on child.parent_id = parent.id
    where parent.depth < 6
  )
  cycle id set is_cycle using path,
  scoped_tag_ids as (
    select id
    from descendant_tags
    where not is_cycle
  )
  select
    li.id,
    li.type,
    li.title,
    li.description,
    li.url,
    li.content,
    coalesce(
      (
        select array_agg(it.tag_id order by it.tag_id)
        from public.item_tags it
        where it.item_id = li.id
          and it.user_id = li.user_id
      ),
      '{}'::uuid[]
    ) as tag_ids
  from public.library_items li
  where exists (
    select 1
    from public.item_tags it
    where it.item_id = li.id
      and it.user_id = li.user_id
      and it.tag_id in (select id from scoped_tag_ids)
  )
  order by li.created_at desc, li.id desc;
$$;

grant execute on function public.get_tag_rollup_items(uuid) to authenticated;

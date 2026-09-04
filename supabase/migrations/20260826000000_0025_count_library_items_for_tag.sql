-- Contagem exata (rollup, deduplicado) de itens sob uma tag e suas
-- descendentes, para o card "itens" do head da página de tag.
-- Mesma CTE recursiva de search_library (0017), sem paginação/filtros --
-- só a contagem. `security invoker` + `search_path = ''`: mesma postura de
-- least-privilege das demais RPCs deste arquivo.
create or replace function public.count_library_items_for_tag(p_tag_id uuid)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive descendant_tags as (
    select t.id, 1 as depth
    from public.tags t
    where t.id = p_tag_id

    union all

    select child.id, parent.depth + 1
    from public.tags child
    join descendant_tags parent on child.parent_id = parent.id
    where parent.depth < 6
  ) cycle id set is_cycle using path,
  scoped_tag_ids as (
    select dt.id from descendant_tags dt where not dt.is_cycle
  )
  select count(*)
  from public.library_items li
  where exists (
    select 1 from public.item_tags it
    where it.item_id = li.id and it.user_id = li.user_id
      and it.tag_id in (select sti.id from scoped_tag_ids sti)
  );
$$;

grant execute on function public.count_library_items_for_tag(uuid) to authenticated;

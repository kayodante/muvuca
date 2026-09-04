-- Tag hierarchy invariants: no self-parent, no cycle, max depth 6 levels
-- (root = level 1), enforced on every INSERT and on every UPDATE that
-- touches parent_id.
--
-- Concurrency: two concurrent parent_id UPDATEs on different branches of the
-- same user's tree can each look valid in isolation yet jointly produce a
-- cycle. pg_advisory_xact_lock(hashtext(user_id::text)) serializes hierarchy
-- writes per user for the duration of the transaction, closing that window.
--
-- Depth: reparenting a tag can push its own position deeper AND push its
-- existing descendants deeper. Both are checked -- the ancestor walk bounds
-- the new position, the descendant CTE bounds the deepest existing
-- descendant relative to the new position. The `offset_from_new < 6` guard
-- in the CTE is defensive: even though this trigger prevents cycles by
-- construction, a defensive bound keeps the recursion from running away if
-- a cycle is ever introduced through another path (mirrors the CYCLE
-- defense required for the read-side descendants CTE).

create function public.enforce_tag_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_new_depth int;
  v_ancestor uuid;
  v_max_descendant_offset int;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a tag não pode ser pai de si mesma';
    end if;

    v_new_depth := 2;
    v_ancestor := new.parent_id;

    while v_ancestor is not null loop
      if v_ancestor = new.id then
        raise exception 'esta alteração criaria um ciclo na hierarquia de tags';
      end if;

      if v_new_depth > 6 then
        raise exception 'a hierarquia de tags excede a profundidade máxima de 6 níveis';
      end if;

      select parent_id into v_ancestor
      from public.tags
      where id = v_ancestor;

      if v_ancestor is not null then
        v_new_depth := v_new_depth + 1;
      end if;
    end loop;
  else
    v_new_depth := 1;
  end if;

  with recursive descendants as (
    select id, 0 as offset_from_new
    from public.tags
    where parent_id = new.id

    union all

    select t.id, d.offset_from_new + 1
    from public.tags t
    join descendants d on t.parent_id = d.id
    where d.offset_from_new < 6
  )
  select coalesce(max(offset_from_new) + 1, 0) into v_max_descendant_offset
  from descendants;

  if v_new_depth + v_max_descendant_offset > 6 then
    raise exception 'esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes';
  end if;

  return new;
end;
$$;

create trigger tags_enforce_hierarchy
  before insert or update of parent_id on public.tags
  for each row
  execute function public.enforce_tag_hierarchy();

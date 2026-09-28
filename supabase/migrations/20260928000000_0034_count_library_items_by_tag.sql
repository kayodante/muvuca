-- AAA-182: contagem rollup de itens de todas as tags do usuário numa query
-- só, para a árvore da sidebar. Mesma semântica de
-- count_library_items_for_tag (0025) -- a tag mais as descendentes, item
-- deduplicado -- para o número da sidebar bater com o card "itens" da página
-- da tag. Chamar a 0025 uma vez por row seria uma CTE recursiva por tag em
-- toda navegação do app.
--
-- O fecho (ancestral, descendente) é montado uma vez para a árvore inteira:
-- cada tag abre o próprio caminho e desce pelos filhos. Teto de 6 níveis e
-- `cycle` como na 0025; count(distinct) conta uma vez o item marcado com pai
-- e filho ao mesmo tempo. Tag sem item não aparece -- o app lê como 0.
--
-- security invoker + search_path = '' como as demais. Escopo explícito por
-- auth.uid() além do RLS, mesma postura da 0033: sem parâmetro, a função lê
-- as tabelas inteiras, e convertida para security definer contaria as tags
-- de todo mundo. supabase/tests/17 prova isso com o RLS desligado.
create function public.count_library_items_by_tag()
returns table (tag_id uuid, item_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive tag_paths as (
    select t.id as ancestor_id, t.id as descendant_id, 1 as depth
    from public.tags t
    where t.user_id = (select auth.uid())

    union all

    select tp.ancestor_id, child.id, tp.depth + 1
    from public.tags child
    join tag_paths tp on child.parent_id = tp.descendant_id
    where tp.depth < 6
      and child.user_id = (select auth.uid())
  ) cycle descendant_id set is_cycle using path
  select tp.ancestor_id, count(distinct it.item_id)
  from tag_paths tp
  join public.item_tags it on it.tag_id = tp.descendant_id
  where not tp.is_cycle
    and it.user_id = (select auth.uid())
  group by tp.ancestor_id;
$$;

grant execute on function public.count_library_items_by_tag() to authenticated;

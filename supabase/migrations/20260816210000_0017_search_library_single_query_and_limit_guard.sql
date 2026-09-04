-- Um único texto de query para as 10 combinações de sort × direção de
-- cursor com teto de página explícito.
--
-- O corpo comum -- CTE recursiva de rollup com cap de profundidade 6,
-- filtros de texto/tipo/tag e projeção -- existe uma vez só, como literal
-- SQL. Só o predicado de cursor e o `order by` são concatenados, e ambos
-- vêm de três tokens derivados por `case` da allowlist de `p_sort` que já
-- foi validada acima: a coluna de ordenação, a direção e o operador de
-- comparação. Nenhum valor recebido do cliente entra no texto: `p_query`,
-- `p_tag_id`, `p_include_descendants`, `p_types`, `p_cursor` e `p_limit`
-- chegam como bind parameters $1..$9.
--
-- O `order by` continua nomeando a coluna real em vez de usar um `case`
-- genérico. Um `case` no `order by` produziria uma expressão não indexada e
-- destruiria o uso de library_items_user_id_created_at_id_idx,
-- library_items_user_id_updated_at_id_idx e
-- library_items_user_id_title_id_idx (0006_indexes.sql), junto com o plano
-- de keyset.
--
-- "Andar para trás" em um sort é a mesma query que "andar para frente" no
-- sort espelhado; por isso as 10 combinações colapsam em 6 formas físicas,
-- e as 6 em um único texto parametrizado. Quem consome a RPC reinverte as
-- linhas da página anterior (lib/database/queries/items.ts).
--
-- ESTE TETO É ESPELHADO EM lib/database/queries/items.ts (PAGE_SIZE + 1 precisa
-- ser <= SEARCH_LIBRARY_MAX_LIMIT). O teste
-- lib/database/queries/__tests__/page-size-rpc-limit.test.ts lê o valor
-- declarado abaixo e falha se os dois lados divergirem.
create or replace function public.search_library(
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
as $fn$
declare
  v_query text := nullif(btrim(p_query), '');
  v_tsquery tsquery;
  v_pattern text;
  v_cursor_timestamp timestamptz;
  v_cursor_title text;
  v_cursor_id uuid;
  v_cursor_dir text;
  v_max_limit constant int := 49; -- SEARCH_LIBRARY_MAX_LIMIT
  v_limit int := coalesce(p_limit, v_max_limit);
  v_descending boolean;
  v_key_column text;
  v_key_type text;
  v_order text;
  v_operator text;
  v_sql text;
begin
  if p_sort not in ('newest', 'oldest', 'title_asc', 'title_desc', 'updated') then
    raise exception 'ordenação inválida';
  end if;

  if v_limit < 1 or v_limit > v_max_limit then
    raise exception 'limite inválido';
  end if;

  if v_query is not null then
    v_tsquery := websearch_to_tsquery('simple'::regconfig, v_query);
    v_pattern := '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  end if;

  begin
    v_cursor_id := (p_cursor ->> 'id')::uuid;
    v_cursor_dir := coalesce(p_cursor ->> 'dir', 'next');
    if p_sort in ('newest', 'oldest', 'updated') then
      v_cursor_timestamp := (p_cursor ->> 'timestamp')::timestamptz;
    else
      v_cursor_title := p_cursor ->> 'title';
    end if;
  exception when others then
    v_cursor_id := null;
    v_cursor_timestamp := null;
    v_cursor_title := null;
    v_cursor_dir := 'next';
  end;

  if v_cursor_dir not in ('next', 'prev') then
    v_cursor_dir := 'next';
  end if;

  -- Allowlist -> identificador. p_sort já foi validado, então estes três
  -- literais são os únicos valores possíveis; nada aqui vem do cliente.
  v_key_column := case
    when p_sort in ('newest', 'oldest') then 'created_at'
    when p_sort = 'updated' then 'updated_at'
    else 'title'
  end;

  v_key_type := case when v_key_column = 'title' then 'text' else 'timestamptz' end;

  -- Direção natural do sort, invertida quando a página é caminhada para trás.
  v_descending := p_sort in ('newest', 'updated', 'title_desc');

  if v_cursor_dir = 'prev' and v_cursor_id is not null then
    v_descending := not v_descending;
  end if;

  v_order := case when v_descending then 'desc' else 'asc' end;
  v_operator := case when v_descending then '<' else '>' end;

  v_sql := $sql$
    with recursive descendant_tags as (
      select t.id, 1 as depth
      from public.tags t
      where t.id = $2

      union all

      select child.id, parent.depth + 1
      from public.tags child
      join descendant_tags parent on child.parent_id = parent.id
      where $3 and parent.depth < 6
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
    where ($4::public.item_type[] is null or li.type = any($4))
      and ($1::text is null or li.search_vector @@ $5::tsquery
        or li.title ilike $6 escape E'\\'
        or coalesce(li.url, '') ilike $6 escape E'\\')
      and ($2::uuid is null or exists (
        select 1 from public.item_tags it
        where it.item_id = li.id and it.user_id = li.user_id
          and it.tag_id in (select sti.id from scoped_tag_ids sti)))
  $sql$
    || ' and ($8::uuid is null or (li.' || quote_ident(v_key_column) || ', li.id) '
    || v_operator || ' ($9::' || v_key_type || ', $8))'
    || ' order by li.' || quote_ident(v_key_column) || ' ' || v_order
    || ', li.id ' || v_order
    || ' limit $7';

  if v_key_column = 'title' then
    return query execute v_sql
      using v_query, p_tag_id, p_include_descendants, p_types,
            v_tsquery, v_pattern, v_limit, v_cursor_id, v_cursor_title;
  else
    return query execute v_sql
      using v_query, p_tag_id, p_include_descendants, p_types,
            v_tsquery, v_pattern, v_limit, v_cursor_id, v_cursor_timestamp;
  end if;
end;
$fn$;

grant execute on function public.search_library(text, uuid, boolean, public.item_type[], text, jsonb, int) to authenticated;

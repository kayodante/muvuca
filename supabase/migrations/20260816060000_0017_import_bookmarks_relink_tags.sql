-- Reimportar favoritos reorganizados precisa reassociar links que já estão
-- na biblioteca às novas pastas.
--
-- A versão anterior (0013, ajustada em 0015) executava `continue` quando o
-- insert em library_items conflitava com library_items_unique_link_per_user,
-- antes de chegar ao insert em item_tags. Resultado: quem reorganizava as
-- pastas no navegador e reimportava perdia exatamente a informação que
-- queria trazer. Agora o id do item existente é recuperado e a associação é
-- criada com `on conflict do nothing` -- a PK composta (item_id, tag_id) de
-- item_tags é quem garante a idempotência.
--
-- A reassociação é aditiva: tags anteriores do item e os campos do item
-- (título, url, descrição) não são tocados, porque podem ser curadoria
-- manual do usuário.
--
-- O contador `duplicates_ignored` sai de cena: depois desta mudança o item
-- duplicado não é mais ignorado, e o número misturava "já estava na
-- biblioteca" com "repetido no próprio arquivo". Entra `associations_created`,
-- que conta as linhas efetivamente inseridas em item_tags. A distinção entre
-- os dois tipos de duplicata é feita no cliente, que tem o snapshot da
-- biblioteca anterior à importação e a contagem de repetições do arquivo.
--
-- O drop explícito é necessário: renomear coluna de um `returns table` muda
-- o tipo composto de retorno, e `create or replace function` rejeita isso.

drop function if exists public.import_browser_bookmarks(jsonb, jsonb);

create function public.import_browser_bookmarks(p_tags jsonb, p_items jsonb)
returns table (items_imported integer, tags_created integer, associations_created integer)
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
  associations_created := 0;

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
      -- O link já existe para este usuário. A leitura é escopada por RLS e
      -- pelo user_id derivado da sessão -- nunca por dado vindo do payload --
      -- e casa com o índice parcial library_items_unique_link_per_user.
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'link'
          and normalized_url = v_item."normalizedUrl";
      -- Só acontece em corrida com outra transação. Pular o item é preferível
      -- a abortar a importação inteira do usuário.
      if v_item_id is null then continue; end if;
    else
      items_imported := items_imported + 1;
    end if;

    if v_item."tagKey" is not null then
      v_tag_id := (v_tag_ids ->> v_item."tagKey")::uuid;
      if v_tag_id is null then raise exception 'pasta do favorito inválida'; end if;
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, v_tag_id)
      on conflict do nothing;
      if found then associations_created := associations_created + 1; end if;
    end if;
  end loop;

  return next;
end;
$$;

grant execute on function public.import_browser_bookmarks(jsonb, jsonb) to authenticated;

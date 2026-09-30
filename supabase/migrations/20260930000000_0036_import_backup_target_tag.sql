-- AAA-246: importar um backup JSON "dentro" de uma tag existente.
-- Com p_target_tag_id, a raiz do arquivo de mesmo nome do destino funde nele
-- (sem criar nada); as demais raízes viram filhas do destino (casam por nome
-- ou são criadas); itens sem tag no arquivo recebem o destino. A profundidade
-- máxima é imposta pelo trigger de hierarquia e desfaz a transação inteira.
-- Sem destino o comportamento é o de 0033: raiz casa só com raiz.

drop function public.import_library_backup(jsonb, jsonb);

create function public.import_library_backup(
  p_tags jsonb,
  p_items jsonb,
  p_target_tag_id uuid default null
)
returns table (items_imported integer, tags_created integer, duplicates_ignored integer)
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
  v_tag_key text;
  v_tag_ids jsonb := '{}'::jsonb;
  v_is_new boolean;
  v_target_name text;
begin
  if auth.uid() is null
     or jsonb_typeof(p_tags) <> 'array'
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_tags) > 5000
     or jsonb_array_length(p_items) > 20000 then
    raise exception 'restauração inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  if p_target_tag_id is not null then
    select name_normalized into v_target_name from public.tags
      where id = p_target_tag_id and user_id = (select auth.uid());
    if not found then
      raise exception 'tag não encontrada';
    end if;
  end if;

  items_imported := 0;
  tags_created := 0;
  duplicates_ignored := 0;

  for v_tag in
    select * from jsonb_to_recordset(p_tags)
      as x(key text, "parentKey" text, name text, slug text, "colorToken" text,
           description text, "createdAt" timestamptz)
  loop
    v_parent_id := null;
    if v_tag."parentKey" is not null then
      v_parent_id := (v_tag_ids ->> v_tag."parentKey")::uuid;
      if v_parent_id is null then
        raise exception 'hierarquia de tags inválida';
      end if;
    elsif p_target_tag_id is not null then
      -- Raiz do arquivo com o nome do destino funde nele; as demais entram sob ele.
      if lower(btrim(v_tag.name)) = v_target_name then
        v_tag_ids := v_tag_ids || jsonb_build_object(v_tag.key, p_target_tag_id);
        continue;
      end if;
      v_parent_id := p_target_tag_id;
    end if;

    select id into v_tag_id from public.tags
      where user_id = (select auth.uid())
        and parent_id is not distinct from v_parent_id
        and name_normalized = lower(btrim(v_tag.name));

    if v_tag_id is null then
      insert into public.tags (
        user_id, parent_id, name, slug, color_token, description, created_at
      )
      values (
        (select auth.uid()), v_parent_id, v_tag.name, v_tag.slug,
        coalesce(v_tag."colorToken", 'stone'), v_tag.description,
        coalesce(v_tag."createdAt", now())
      )
      on conflict do nothing returning id into v_tag_id;

      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where user_id = (select auth.uid())
            and parent_id is not distinct from v_parent_id
            and name_normalized = lower(btrim(v_tag.name));
      else
        tags_created := tags_created + 1;
      end if;
    end if;

    v_tag_ids := v_tag_ids || jsonb_build_object(v_tag.key, v_tag_id);
  end loop;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(type text, title text, url text, "normalizedUrl" text,
           content text, description text, "createdAt" timestamptz,
           language text, "tagKeys" jsonb)
  loop
    v_is_new := false;

    if v_item.type = 'link' then
      insert into public.library_items (
        user_id, type, title, url, normalized_url, description, created_at
      )
      values (
        (select auth.uid()), 'link', v_item.title, v_item.url,
        v_item."normalizedUrl", v_item.description,
        coalesce(v_item."createdAt", now())
      )
      on conflict do nothing returning id into v_item_id;

      if v_item_id is null then
        select id into v_item_id from public.library_items
          where user_id = (select auth.uid())
            and type = 'link' and normalized_url = v_item."normalizedUrl";
      else
        v_is_new := true;
      end if;
    elsif v_item.type = 'code_component' then
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'code_component'
          and title = v_item.title
          and content is not distinct from v_item.content
          and normalized_url is not distinct from v_item."normalizedUrl";

      if v_item_id is null then
        insert into public.library_items (
          user_id, type, title, url, normalized_url, content, description, language, created_at
        )
        values (
          (select auth.uid()), 'code_component', v_item.title, v_item.url,
          v_item."normalizedUrl", v_item.content, v_item.description,
          v_item.language,
          coalesce(v_item."createdAt", now())
        )
        returning id into v_item_id;
        v_is_new := true;
      end if;
    else
      select id into v_item_id from public.library_items
        where user_id = (select auth.uid())
          and type = 'prompt'
          and title = v_item.title
          and content is not distinct from v_item.content;

      if v_item_id is null then
        insert into public.library_items (
          user_id, type, title, content, description, created_at
        )
        values (
          (select auth.uid()), 'prompt', v_item.title, v_item.content,
          v_item.description, coalesce(v_item."createdAt", now())
        )
        returning id into v_item_id;
        v_is_new := true;
      end if;
    end if;

    if v_is_new then
      items_imported := items_imported + 1;
    else
      duplicates_ignored := duplicates_ignored + 1;
    end if;

    for v_tag_key in
      select jsonb_array_elements_text(coalesce(v_item."tagKeys", '[]'::jsonb))
    loop
      v_tag_id := (v_tag_ids ->> v_tag_key)::uuid;
      if v_tag_id is null then
        raise exception 'tag do item ausente no lote';
      end if;
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, v_tag_id)
      on conflict do nothing;
    end loop;

    -- Item sem tag no arquivo entra no destino; com tag, o rollup já o mostra.
    if p_target_tag_id is not null
       and jsonb_array_length(coalesce(v_item."tagKeys", '[]'::jsonb)) = 0 then
      insert into public.item_tags (user_id, item_id, tag_id)
      values ((select auth.uid()), v_item_id, p_target_tag_id)
      on conflict do nothing;
    end if;
  end loop;

  return next;
end;
$$;

revoke execute on function public.import_library_backup(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.import_library_backup(jsonb, jsonb, uuid) to authenticated;

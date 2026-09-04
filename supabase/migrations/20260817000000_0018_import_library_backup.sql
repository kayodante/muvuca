-- Restauração do backup JSON. Complementa import_browser_bookmarks:
-- aceita prompts, descrição, cor de tag e múltiplas tags por item.
--
-- Política de colisão: idempotente e não destrutiva. Tag existente é
-- reaproveitada sem ter nome/cor/descrição
-- sobrescritos; link existente (mesma normalized_url) é reaproveitado; prompt
-- é deduplicado por (title, content) exatos, porque prompts não têm chave
-- natural no schema.
--
-- Reconciliação de tags em duplicata: um item já
-- existente ainda tem suas associações de tag do backup processadas -- só os
-- campos do próprio item não são sobrescritos. Sem isso, reimportar um
-- backup depois de adicionar uma tag nova a um item existente nunca
-- propagava essa tag.
--
-- Atomicidade: a restauração inteira roda numa única
-- chamada, dentro de uma única transação de Postgres -- ou tudo é
-- persistido, ou nada é. O cliente não fatia mais em chamadas separadas por
-- lote: cada chamada teria sua própria transação, e um lote no meio que
-- falhasse deixava os lotes anteriores já persistidos.
--
-- Concorrência: pg_advisory_xact_lock(hashtext(user_id))
-- serializa restaurações do mesmo usuário (mesmo padrão de
-- 0008_tag_hierarchy.sql e 0015_tag_reparent_collision.sql), fechando a
-- corrida de deduplicação de prompt entre duas restaurações concorrentes --
-- prompt não tem (e não deve ganhar) constraint unique em (title, content),
-- porque dois prompts idênticos podem ser legítimos.
--
-- security invoker: toda leitura e escrita continua sob a RLS do chamador, e
-- user_id vem sempre de auth.uid(), nunca do payload.

create function public.import_library_backup(p_tags jsonb, p_items jsonb)
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
begin
  if auth.uid() is null
     or jsonb_typeof(p_tags) <> 'array'
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_tags) > 5000
     or jsonb_array_length(p_items) > 20000 then
    raise exception 'restauração inválida';
  end if;

  -- Serializa restaurações concorrentes do mesmo usuário pela duração desta
  -- transação; liberado automaticamente no commit ou rollback.
  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  items_imported := 0;
  tags_created := 0;
  duplicates_ignored := 0;

  for v_tag in
    select * from jsonb_to_recordset(p_tags)
      as x(key text, "parentKey" text, name text, "colorToken" text,
           description text, "createdAt" timestamptz)
  loop
    v_parent_id := null;
    if v_tag."parentKey" is not null then
      v_parent_id := (v_tag_ids ->> v_tag."parentKey")::uuid;
      if v_parent_id is null then
        raise exception 'hierarquia de tags inválida';
      end if;
    end if;

    select id into v_tag_id from public.tags
      where parent_id is not distinct from v_parent_id
        and name_normalized = lower(btrim(v_tag.name));

    if v_tag_id is null then
      insert into public.tags (
        user_id, parent_id, name, color_token, description, created_at
      )
      values (
        (select auth.uid()), v_parent_id, v_tag.name,
        coalesce(v_tag."colorToken", 'stone'), v_tag.description,
        coalesce(v_tag."createdAt", now())
      )
      on conflict do nothing returning id into v_tag_id;

      if v_tag_id is null then
        select id into v_tag_id from public.tags
          where parent_id is not distinct from v_parent_id
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
           "tagKeys" jsonb)
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
          where type = 'link' and normalized_url = v_item."normalizedUrl";
      else
        v_is_new := true;
      end if;
    else
      -- Sem índice único para conflitar: verifica antes de inserir. A
      -- janela entre a leitura e a escrita é fechada pelo advisory lock
      -- acima, não por esta consulta isoladamente.
      select id into v_item_id from public.library_items
        where type = 'prompt'
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

    -- Associações de tag são reconciliadas tanto para item novo quanto para
    -- duplicata: um item já existente pode ganhar tags novas do backup, sem
    -- que seus próprios campos sejam sobrescritos (política não destrutiva).
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
  end loop;

  return next;
end;
$$;

-- Apoia a deduplicação de prompts acima, que é a única consulta do produto
-- que filtra prompts por título -- índice criado a partir de um padrão de
-- consulta real, não especulativo.
create index library_items_prompt_dedupe
  on public.library_items (user_id, title)
  where type = 'prompt';

grant execute on function public.import_library_backup(jsonb, jsonb) to authenticated;

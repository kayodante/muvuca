-- AAA-96: URLs amigáveis de tag (/t/design/recursos-assets/icones).
--
-- UUID continua sendo a identidade da tag -- FKs, item_tags, RPCs e Server
-- Actions não mudam. `slug` é só identidade de roteamento. Só o slug de cada
-- tag é persistido; o caminho da URL é derivado de parent_id + slug na
-- leitura, então renomear ou mover uma tag muda a URL dela e de todas as
-- descendentes sem nenhum update em cascata.
--
-- O banco é o único autor de slug. Três dos caminhos que criam ou renomeiam
-- tag são RPC SQL (import_browser_bookmarks, import_library_backup e
-- delete_tag_reparent_children, que renomeia com sufixo " (N)"), então uma
-- cópia da regra em TypeScript seria uma segunda implementação. Toda escrita
-- passa pelo trigger tags_set_slug abaixo.
--
-- Colisão pós-normalização ("Ícones" e "Icones" são nomes distintos e
-- legais no mesmo nível, porque name_normalized só faz lower(btrim())) vira
-- sufixo, não erro -- a mesma intenção de 0015_tag_reparent_collision.sql:
-- o primeiro fica `icones`, o seguinte `icones-2`.

-- Regra única de slug: NFKD + remoção das marcas combinantes (acentos,
-- cedilha, til), minúsculas, qualquer sequência fora de [a-z0-9] vira um
-- hífen, sem hífen nas pontas, base truncada em 80. Nome sem nenhum
-- alfanumérico ASCII ("★", "日本語") vira `tag` -- nunca slug vazio.
create function public.slugify_tag_name(p_name text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      rtrim(
        left(
          btrim(
            regexp_replace(
              regexp_replace(lower(normalize(p_name, nfkd)), '[\u0300-\u036f]', '', 'g'),
              '[^a-z0-9]+', '-', 'g'
            ),
            '-'
          ),
          80
        ),
        '-'
      ),
      ''
    ),
    'tag'
  );
$$;

-- Um slug já presente na linha -- o atual, num update; o do arquivo, num
-- restore de backup -- só sobrevive se ainda for uma forma do nome (`base`
-- ou `base-N`) e estiver livre entre os irmãos. Isso preserva a URL num
-- rename que não muda a base e num restore, sem nunca aceitar um slug
-- arbitrário enviado pelo cliente. Caso contrário, o primeiro livre entre
-- `base`, `base-2`, `base-3`...
--
-- Concorrência: o mesmo advisory lock por usuário de enforce_tag_hierarchy
-- (0008) serializa a escolha do sufixo entre transações do mesmo usuário, e
-- tags_unique_slug_per_parent continua sendo a autoridade final.
create function public.set_tag_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text := public.slugify_tag_name(new.name);
  v_suffix int := 1;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  if new.slug is null
     or not (new.slug = v_base or new.slug ~ ('^' || v_base || '-[0-9]{1,9}$')) then
    new.slug := v_base;
  end if;

  while exists (
    select 1
    from public.tags t
    where t.user_id = new.user_id
      and t.parent_id is not distinct from new.parent_id
      and t.slug = new.slug
      and t.id <> new.id
  ) loop
    v_suffix := v_suffix + 1;
    new.slug := v_base || '-' || v_suffix;
  end loop;

  return new;
end;
$$;

alter table public.tags add column slug text;

create trigger tags_set_slug
  before insert or update of name, parent_id, slug on public.tags
  for each row
  execute function public.set_tag_slug();

-- Backfill determinístico: linha a linha, irmãos do mais antigo para o mais
-- novo, então numa colisão a tag mais antiga fica sem sufixo. tags_set_updated_at
-- fica desligado só durante o backfill para que ganhar um slug não pareça
-- uma edição do usuário.
alter table public.tags disable trigger tags_set_updated_at;

do $$
declare
  v_tag record;
begin
  for v_tag in
    select id from public.tags order by user_id, parent_id nulls first, created_at, id
  loop
    update public.tags set slug = null where id = v_tag.id;
  end loop;
end;
$$;

alter table public.tags enable trigger tags_set_updated_at;

-- O default vazio só existe para o insert não precisar informar slug (nem o
-- tipo gerado exigir): tags_set_slug troca '' pelo slug do nome antes de
-- qualquer constraint ser checada.
alter table public.tags alter column slug set default '';
alter table public.tags alter column slug set not null;

alter table public.tags
  add constraint tags_slug_format
  check (char_length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Um índice só cobre raiz e filhas: `nulls not distinct` (Postgres 15+)
-- trata parent_id nulo como igual, ao contrário dos dois índices parciais de
-- nome de 0003. `slug` antes de `parent_id` para que a resolução de caminho
-- (`where slug in (...)`, sob RLS por user_id) use o prefixo do índice.
create unique index tags_unique_slug_per_parent
  on public.tags (user_id, slug, parent_id) nulls not distinct;

-- Tags pedidas + toda a cadeia de ancestrais delas, numa query. Existe para
-- montar o href (/t/raiz/.../tag) das tags que uma página de itens
-- referencia sem carregar a árvore inteira do usuário (AAA-78). `union` (e
-- não `union all`) deduplica ancestrais compartilhados e termina mesmo se
-- um ciclo existisse. security invoker: sob RLS, id de outro usuário
-- simplesmente não aparece.
create function public.tags_with_ancestors(p_tag_ids uuid[])
returns setof public.tags
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive chain as (
    select t.*
    from public.tags t
    where t.id = any(p_tag_ids)

    union

    select p.*
    from public.tags p
    join chain c on p.id = c.parent_id
  )
  select * from chain;
$$;

grant execute on function public.slugify_tag_name(text) to authenticated;
grant execute on function public.tags_with_ancestors(uuid[]) to authenticated;

-- import_library_backup: backup 1.3 carrega o slug de cada tag. Ele é só
-- uma dica para tags_set_slug (ver acima) -- aceito se for forma válida do
-- nome e estiver livre, derivado do nome caso contrário. Arquivo antigo não
-- tem a chave e a coluna chega nula. Só mudam a coluna "slug" no
-- jsonb_to_recordset de tags e no insert; o resto é o corpo de 0028.
create or replace function public.import_library_backup(p_tags jsonb, p_items jsonb)
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

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

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
    end if;

    select id into v_tag_id from public.tags
      where parent_id is not distinct from v_parent_id
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
          where type = 'link' and normalized_url = v_item."normalizedUrl";
      else
        v_is_new := true;
      end if;
    elsif v_item.type = 'code_component' then
      select id into v_item_id from public.library_items
        where type = 'code_component'
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

grant execute on function public.import_library_backup(jsonb, jsonb) to authenticated;

-- Library items: links and prompts.
--
-- The type-payload check constraint is a minimal integrity barrier at the
-- database boundary; canonical URL validation still happens with `new URL()`
-- at the application boundary, and any component rendering a persisted URL
-- must independently re-check the protocol before use.
--
-- search_vector uses the two-argument, IMMUTABLE form of to_tsvector because
-- a STORED generated column requires an immutable expression; the
-- single-argument form depends on session search configuration and is not
-- immutable. Only the first 8000 characters of `content` are indexed to
-- bound reindexing cost on writes to large prompts.

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.item_type not null,
  title text not null,
  url text,
  normalized_url text,
  content text,
  description text,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description, '') || ' ' || coalesce(url, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, left(coalesce(content, ''), 8000)), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_items_title_length check (char_length(btrim(title)) between 1 and 240),
  constraint library_items_description_length check (description is null or char_length(description) <= 2000),
  constraint library_items_type_payload check (
    (
      type = 'link'
      and url is not null
      and char_length(url) between 1 and 4096
      and url ~* '^https?://'
      and normalized_url is not null
      and char_length(normalized_url) between 1 and 4096
      and normalized_url ~* '^https?://'
      and content is null
    )
    or
    (
      type = 'prompt'
      and content is not null
      and char_length(content) between 1 and 100000
      and url is null
      and normalized_url is null
    )
  )
);

-- Required so item_tags (0005) can target (id, user_id) as a composite
-- foreign key.
alter table public.library_items
  add constraint library_items_id_user_id_unique unique (id, user_id);

-- Deduplicates links by normalized URL, per user. Deliberately does not
-- constrain prompts, which have no comparable natural key.
create unique index library_items_unique_link_per_user
  on public.library_items (user_id, normalized_url)
  where type = 'link';

create trigger library_items_set_updated_at
  before update on public.library_items
  for each row
  execute function public.set_updated_at();

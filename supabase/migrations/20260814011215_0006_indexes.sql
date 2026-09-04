-- Query-shape-driven indexes.
--
-- Every foreign key column below is indexed explicitly: Postgres does not
-- index FK columns automatically, and unindexed FKs cause both slow lookups
-- and slow ON DELETE CASCADE.

-- tags
create index tags_user_id_idx on public.tags (user_id);
create index tags_user_id_parent_id_idx on public.tags (user_id, parent_id);

-- library_items: one composite index per keyset-paginated sort
-- (created_at/updated_at/title, each tie-broken by id).
create index library_items_user_id_idx on public.library_items (user_id);
create index library_items_user_id_created_at_id_idx on public.library_items (user_id, created_at, id);
create index library_items_user_id_updated_at_id_idx on public.library_items (user_id, updated_at, id);
create index library_items_user_id_title_id_idx on public.library_items (user_id, title, id);

-- item_tags: both directions of the N:N join
create index item_tags_tag_id_user_id_idx on public.item_tags (tag_id, user_id);
create index item_tags_item_id_user_id_idx on public.item_tags (item_id, user_id);

-- Full-text (weighted, see 0004) and partial/trigram match for title and url.
create index library_items_search_vector_idx on public.library_items using gin (search_vector);
create index library_items_title_trgm_idx on public.library_items using gin (title extensions.gin_trgm_ops);
create index library_items_url_trgm_idx on public.library_items using gin (url extensions.gin_trgm_ops);

-- Item <-> tag association (N:N).
--
-- Both foreign keys are composite against (id, user_id) of their target
-- table and share the same user_id column on this table. That forces
-- item.user_id = tag.user_id = item_tags.user_id for any row that can ever
-- be inserted, which makes a cross-user association structurally
-- impossible -- independent of, and in addition to, RLS (0007_rls.sql).

create table public.item_tags (
  user_id uuid not null,
  item_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  constraint item_tags_pkey primary key (item_id, tag_id),
  constraint item_tags_item_user_fkey
    foreign key (item_id, user_id) references public.library_items (id, user_id) on delete cascade,
  constraint item_tags_tag_user_fkey
    foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade
);

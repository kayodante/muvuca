-- Hierarchical tags.
--
-- parent_id is validated by a composite self-referential FK against
-- (id, user_id) rather than a plain FK against (id): this makes it
-- structurally impossible for a tag to become the parent of a tag owned by a
-- different user, independent of and in addition to RLS (0007_rls.sql).
-- Cycle and depth prevention live in 0008_tag_hierarchy.sql because they
-- require row-by-row procedural logic that a declarative constraint cannot
-- express.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid,
  name text not null,
  name_normalized text generated always as (lower(btrim(name))) stored,
  description text,
  color_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint tags_description_length check (description is null or char_length(description) <= 500),
  constraint tags_color_token_allowed check (color_token in (
    'lime', 'emerald', 'teal', 'cyan', 'blue', 'violet',
    'purple', 'pink', 'red', 'orange', 'amber', 'stone'
  ))
);

-- Required so item_tags (0005) and the self-referential parent FK below can
-- target (id, user_id) as a composite foreign key.
alter table public.tags
  add constraint tags_id_user_id_unique unique (id, user_id);

-- A null parent_id (root tag) trivially satisfies a composite FK, so this
-- does not block root tags.
alter table public.tags
  add constraint tags_parent_id_user_id_fkey
  foreign key (parent_id, user_id) references public.tags (id, user_id) on delete restrict;

-- Case-insensitive uniqueness per level. Two distinct partial indexes are
-- required because "unique per parent" cannot be expressed as a single
-- index when the parent itself is nullable; every INSERT ... ON CONFLICT
-- against this table must repeat whichever predicate applies.
create unique index tags_unique_root_name_per_user
  on public.tags (user_id, name_normalized)
  where parent_id is null;

create unique index tags_unique_child_name_per_parent
  on public.tags (user_id, parent_id, name_normalized)
  where parent_id is not null;

create trigger tags_set_updated_at
  before update on public.tags
  for each row
  execute function public.set_updated_at();

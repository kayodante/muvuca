-- Row-Level Security: deny-by-default authorization enforcement.
--
-- `force row level security` applies RLS even to the table owner role that
-- migrations run as, so a policy bug cannot silently pass because of an
-- owner bypass. auth.uid() is wrapped in a `select` in every policy so the
-- planner evaluates it once per statement instead of once per row.
--
-- anon has no grants on these tables. Local Supabase defaults to not
-- auto-exposing new tables to any Data API role without an explicit grant
-- (see supabase/config.toml [api] auto_expose_new_tables); the explicit
-- revokes below make that "no anon access" guarantee independent of that
-- default and of the target project's configuration.
--
-- RLS restricts *which rows* a role can see or touch; it never substitutes
-- for the underlying table grant, which restricts whether the role has any
-- access at all. Both layers are required: authenticated gets the table
-- grant here, and the policies below narrow every row to its owner.

-- tags

alter table public.tags enable row level security;
alter table public.tags force row level security;

revoke all on public.tags from anon;
grant select, insert, update, delete on public.tags to authenticated;

create policy tags_select on public.tags
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy tags_insert on public.tags
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy tags_update on public.tags
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tags_delete on public.tags
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- library_items

alter table public.library_items enable row level security;
alter table public.library_items force row level security;

revoke all on public.library_items from anon;
grant select, insert, update, delete on public.library_items to authenticated;

create policy library_items_select on public.library_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy library_items_insert on public.library_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy library_items_update on public.library_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy library_items_delete on public.library_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- item_tags

alter table public.item_tags enable row level security;
alter table public.item_tags force row level security;

revoke all on public.item_tags from anon;
grant select, insert, update, delete on public.item_tags to authenticated;

create policy item_tags_select on public.item_tags
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy item_tags_insert on public.item_tags
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy item_tags_update on public.item_tags
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy item_tags_delete on public.item_tags
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

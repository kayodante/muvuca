-- The only configurable preference is theme. A missing row intentionally
-- means the default: system theme.

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_allowed check (theme in ('system', 'light', 'dark'))
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row
  execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;

revoke all on public.user_preferences from anon;
grant select, insert, update on public.user_preferences to authenticated;

create policy user_preferences_select on public.user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy user_preferences_insert on public.user_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_preferences_update on public.user_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Theme preferences are private, valid and persist as one row per user.
begin;

select plan(9);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('preferences-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('preferences-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

insert into public.user_preferences (user_id, theme)
values ((select auth.uid()), 'dark');

select is(
  (select theme from public.user_preferences),
  'dark',
  'A can save and read their own preference'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.user_preferences),
  0,
  'B cannot read A''s preference via RLS'
);

with upd as (
  update public.user_preferences set theme = 'light'
  where user_id = (select id from fixture_ids where label = 'user_a')
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s preference via RLS'
);

select throws_ok(
  format(
    $sql$insert into public.user_preferences (user_id, theme) values (%L, 'light')$sql$,
    (select id from fixture_ids where label = 'user_a')
  ),
  '42501'::character(5),
  null::text,
  'B cannot create a preference owned by A'
);

select throws_ok(
  $$insert into public.user_preferences (user_id, theme) values ((select auth.uid()), 'neon')$$,
  '23514'::character(5),
  null::text,
  'only documented themes are accepted'
);

select ok(
  has_table_privilege('authenticated', 'public.user_preferences', 'SELECT,INSERT,UPDATE'),
  'authenticated has only the required preference privileges'
);

-- reset_account() (0020_reset_account.sql) needs delete on this table to
-- wipe the caller's own preference row -- deliberately granted, unlike the
-- earlier "no delete at all" posture. Table grant alone would still let B
-- delete A's row if the delete policy were missing/wrong, so the next two
-- assertions prove RLS -- not just the grant -- is what actually scopes it.
select ok(
  has_table_privilege('authenticated', 'public.user_preferences', 'DELETE'),
  'authenticated has delete privilege on preference rows'
);

-- Still authenticated as B (from the block above).
with del as (
  delete from public.user_preferences
  where user_id = (select id from fixture_ids where label = 'user_a')
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s preference via RLS'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

with del as (
  delete from public.user_preferences
  where user_id = (select auth.uid())
  returning 1
)
select is(
  (select count(*)::int from del),
  1,
  'A can delete their own preference'
);

select * from finish();

rollback;

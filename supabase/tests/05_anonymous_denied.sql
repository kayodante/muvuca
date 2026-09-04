-- Unauthenticated access denial: an unauthenticated request must be
-- rejected wherever access requires a real user. The `anon` Postgres role
-- has zero grants on any user-data table (0007_rls.sql), independent of RLS --
-- both layers are required per that migration's header comment. `force
-- row level security` closes the owner-role bypass on top of that.

begin;

select plan(10);

select ok(
  to_regprocedure('public.rls_auto_enable()') is null
    or not has_function_privilege('anon', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE'),
  'anon cannot execute the hosted infrastructure RLS event-trigger helper'
);

select ok(
  to_regprocedure('public.rls_auto_enable()') is null
    or not has_function_privilege('authenticated', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE'),
  'authenticated cannot execute the hosted infrastructure RLS event-trigger helper'
);

select ok(
  not has_table_privilege('anon', 'public.tags', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no CRUD privilege on tags'
);

select ok(
  not has_table_privilege('anon', 'public.library_items', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no CRUD privilege on library_items'
);

select ok(
  not has_table_privilege('anon', 'public.item_tags', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no CRUD privilege on item_tags'
);

select ok(
  not has_table_privilege('anon', 'public.user_preferences', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no CRUD privilege on user_preferences'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.tags'::regclass),
  'row level security is forced on tags'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.library_items'::regclass),
  'row level security is forced on library_items'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.item_tags'::regclass),
  'row level security is forced on item_tags'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.user_preferences'::regclass),
  'row level security is forced on user_preferences'
);

select * from finish();

rollback;

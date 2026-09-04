-- pgTAP setup for local RLS/invariant testing.
--
-- This file is test-only tooling: it never ships as a migration, is not
-- part of the application schema, and only exists to fabricate two
-- authenticated identities and switch role/JWT claims between them so RLS
-- can be exercised the same way PostgREST exercises it in production
-- (auth.uid() reads request.jwt.claims ->> 'sub'). No admin/service-role key
-- is used anywhere in application code; this test setup is the one
-- deliberate, local-only exception.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Test files switch the session role to `authenticated` mid-file (to
-- exercise RLS) and then call tests.authenticate_as() again from under that
-- role to switch identity a second time (e.g. from user A to user B).
-- Without USAGE on this schema, that second call fails with "permission
-- denied for schema tests" once the role is no longer postgres.
grant usage on schema tests to authenticated;

create or replace function tests.create_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is not null then
    return v_user_id;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (id, email, aud, role, email_confirmed_at, created_at, updated_at)
  values (v_user_id, p_email, 'authenticated', 'authenticated', now(), now(), now());

  return v_user_id;
end;
$$;

create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- Not wrapped in begin/rollback: the extension, schema and functions above
-- must persist for every other file in this directory (each of which runs
-- as its own psql invocation). This trivial plan only exists so the pg_prove
-- harness -- which expects TAP output from every file it is given -- has
-- something to parse; it does not assert anything about the schema itself.
select plan(3);
select has_schema('tests', 'tests helper schema exists');
select has_function('tests', 'create_user', array['text'], 'tests.create_user() exists');
select has_function('tests', 'authenticate_as', array['uuid'], 'tests.authenticate_as() exists');
select * from finish();

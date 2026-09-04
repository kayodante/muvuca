-- Column/type/size/uniqueness constraints, including the two ON CONFLICT
-- paths for tags' partial unique indexes.
--
-- "updated_at does not change on SELECT" is not asserted explicitly: a
-- SELECT can never fire a BEFORE UPDATE trigger, so that
-- guarantee is a property of Postgres's execution model, not something this
-- schema could get wrong.
--
-- pgTAP's throws_ok(sql, code_or_msg, description) 3-argument form decides
-- what code_or_msg means by its byte length: exactly 5 bytes is read as a
-- SQLSTATE and then the description argument is (surprisingly) matched
-- against the exact exception message, not used as a free-text label. Every
-- assertion below that only cares about the SQLSTATE therefore calls the
-- unambiguous 4-argument base form directly, with explicit casts
-- (`'code'::character(5), null::text, description`) to dodge overload
-- ambiguity between throws_ok's (text,integer,text,text) and
-- (text,character,text,text) variants.

begin;

select plan(20);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('constraints-a@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 1. color_token outside the allowed palette is rejected.
-- Deliberately not a plausible color name: 'chartreuse' used to sit here and
-- broke this test the day it was added to the palette.
select throws_ok(
  $sql$insert into public.tags (user_id, name, color_token) values (auth.uid(), 'Bad Color', 'not-a-color')$sql$,
  '23514'::character(5),
  null::text,
  'a tag color outside the allowed palette is rejected'
);

-- 2. Empty/whitespace-only tag name is rejected.
select throws_ok(
  $sql$insert into public.tags (user_id, name, color_token) values (auth.uid(), '   ', 'lime')$sql$,
  '23514'::character(5),
  null::text,
  'a whitespace-only tag name is rejected'
);

-- 3. Tag name longer than 80 characters is rejected.
select throws_ok(
  $sql$insert into public.tags (user_id, name, color_token) values (auth.uid(), repeat('x', 81), 'lime')$sql$,
  '23514'::character(5),
  null::text,
  'a tag name over 80 characters is rejected'
);

-- 4. Tag description longer than 500 characters is rejected.
select throws_ok(
  $sql$insert into public.tags (user_id, name, description, color_token) values (auth.uid(), 'Long Desc', repeat('x', 501), 'lime')$sql$,
  '23514'::character(5),
  null::text,
  'a tag description over 500 characters is rejected'
);

-- 5. A link item without a url is rejected.
select throws_ok(
  $sql$insert into public.library_items (user_id, type, title) values (auth.uid(), 'link', 'No URL')$sql$,
  '23514'::character(5),
  null::text,
  'a link item without a url is rejected'
);

-- 6. A link item with a non-http(s) scheme is rejected at the database
--    boundary too, even though canonical validation happens in the
--    application -- defense in depth against a client that skips it.
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values (auth.uid(), 'link', 'JS Scheme', 'javascript:alert(1)', 'javascript:alert(1)')
  $sql$,
  '23514'::character(5),
  null::text,
  'a link item with a javascript: scheme is rejected'
);

-- 7. A prompt item with a url set is rejected (type payload is exclusive).
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content, url)
    values (auth.uid(), 'prompt', 'Prompt With URL', 'some content', 'https://example.com')
  $sql$,
  '23514'::character(5),
  null::text,
  'a prompt item with a url set is rejected'
);

-- 8. Prompt content over 100,000 characters is rejected.
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content)
    values (auth.uid(), 'prompt', 'Too Long', repeat('x', 100001))
  $sql$,
  '23514'::character(5),
  null::text,
  'prompt content over 100,000 characters is rejected'
);

-- 9. Empty item title is rejected.
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content)
    values (auth.uid(), 'prompt', '', 'content')
  $sql$,
  '23514'::character(5),
  null::text,
  'an empty item title is rejected'
);

-- 10. Duplicate normalized_url for the same user is rejected.
select lives_ok(
  $sql$
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values (auth.uid(), 'link', 'First', 'https://dup.example/a', 'https://dup.example/a')
  $sql$,
  'the first link with a given normalized_url succeeds'
);

select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values (auth.uid(), 'link', 'Second', 'https://dup.example/a?utm=1', 'https://dup.example/a')
  $sql$,
  '23505'::character(5),
  null::text,
  'a second link with the same normalized_url for the same user is rejected'
);

-- 11. A valid code_component without url succeeds.
select lives_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content)
    values (auth.uid(), 'code_component', 'Snippet Without URL', 'const x = 1;')
  $sql$,
  'a valid code_component without url succeeds'
);

-- 12. A valid code_component with http(s) url and normalized_url succeeds.
select lives_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content, url, normalized_url)
    values (auth.uid(), 'code_component', 'Snippet With URL', 'const y = 2;', 'https://code.example/y', 'https://code.example/y')
  $sql$,
  'a valid code_component with http(s) url succeeds'
);

-- 13. A code_component with a non-http(s) scheme is rejected.
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, content, url, normalized_url)
    values (auth.uid(), 'code_component', 'Snippet Bad Scheme', 'const z = 3;', 'javascript:alert(1)', 'javascript:alert(1)')
  $sql$,
  '23514'::character(5),
  null::text,
  'a code_component with a javascript: scheme is rejected'
);

-- 14. A code_component without content is rejected.
select throws_ok(
  $sql$
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values (auth.uid(), 'code_component', 'Snippet No Content', 'https://code.example/empty', 'https://code.example/empty')
  $sql$,
  '23514'::character(5),
  null::text,
  'a code_component without content is rejected'
);

-- 12/13/14/15: partial unique indexes on tag names have two distinct code
-- paths (root vs. child) and must not collide across unrelated parents.
with parent1 as (
  insert into public.tags (user_id, name, color_token) values (auth.uid(), 'Parent One', 'lime') returning id
)
insert into fixture_ids select 'parent_1', id from parent1;

with parent2 as (
  insert into public.tags (user_id, name, color_token) values (auth.uid(), 'Parent Two', 'blue') returning id
)
insert into fixture_ids select 'parent_2', id from parent2;

select throws_ok(
  $sql$insert into public.tags (user_id, name, color_token) values (auth.uid(), 'parent one', 'emerald')$sql$,
  '23505'::character(5),
  null::text,
  'a second root tag with a case-insensitive duplicate name is rejected'
);

select lives_ok(
  format(
    $sql$insert into public.tags (user_id, parent_id, name, color_token) values (auth.uid(), %L, 'Shared Child Name', 'lime')$sql$,
    (select id from fixture_ids where label = 'parent_1')
  ),
  'a child tag name can be created under its parent'
);

select throws_ok(
  format(
    $sql$insert into public.tags (user_id, parent_id, name, color_token) values (auth.uid(), %L, 'shared child name', 'blue')$sql$,
    (select id from fixture_ids where label = 'parent_1')
  ),
  '23505'::character(5),
  null::text,
  'a second child tag with a case-insensitive duplicate name under the same parent is rejected'
);

select lives_ok(
  format(
    $sql$insert into public.tags (user_id, parent_id, name, color_token) values (auth.uid(), %L, 'Shared Child Name', 'blue')$sql$,
    (select id from fixture_ids where label = 'parent_2')
  ),
  'the same child tag name is allowed under a different parent'
);

-- 16. updated_at is overwritten by the trigger on UPDATE. now() is constant
--     for the whole transaction in Postgres, so comparing two now()-derived
--     timestamps would always be equal; instead, the row is seeded with an
--     artificial past timestamp and the assertion checks the trigger
--     replaced it. The INSERT and UPDATE are deliberately two separate
--     top-level statements (chained through fixture_ids), not sibling CTEs
--     in one WITH: a data-modifying CTE that UPDATEs a table a sibling CTE
--     just INSERTed into scans that table's pre-statement snapshot and
--     matches zero rows, because the two CTEs share one snapshot and do not
--     see each other's effects on the underlying table.
with created as (
  insert into public.tags (user_id, name, color_token, updated_at)
  values (auth.uid(), 'Updated At Probe', 'lime', timestamptz '2000-01-01')
  returning id
)
insert into fixture_ids select 'updated_at_probe', id from created;

update public.tags set name = 'Updated At Probe (renamed)'
where id = (select id from fixture_ids where label = 'updated_at_probe');

select ok(
  (select updated_at from public.tags where id = (select id from fixture_ids where label = 'updated_at_probe'))
    > timestamptz '2000-01-01',
  'updated_at is overwritten by the trigger on UPDATE, even when explicitly set at INSERT time'
);

select * from finish();

rollback;

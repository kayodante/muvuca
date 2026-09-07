-- link_previews queue: trigger enqueue/re-enqueue, ownership RLS, all 3
-- RPCs (claim/complete/refresh) each with a cross-user-denial assertion,
-- retry/backoff arithmetic, and cascade cleanup (see 0023_link_previews.sql).
--
-- Concurrency note (skip locked): pgTAP runs every statement serially on a
-- single connection/transaction, so two genuinely concurrent
-- `claim_preview_jobs` calls from two different sessions cannot be
-- exercised here. What IS tested below is the observable contract that
-- makes concurrent claims safe: a claimed row's `next_attempt_at` is
-- advanced past `now()` inside the same statement that selects it (`for
-- update skip locked` + the lease), so an immediate second claim call
-- (same session) can no longer see that row. That is the exact property
-- `skip locked` protects across sessions -- one call "owns" a row for the
-- lease window, and no other call (concurrent or sequential) can see it
-- again until the lease expires.

begin;

select plan(65);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.link_previews'::regclass),
  'row level security is forced on link_previews'
);

select ok(
  not has_table_privilege('anon', 'public.link_previews', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no CRUD privilege on link_previews'
);

create temporary table fixture_ids (label text primary key, id uuid not null);
grant select, insert, update, delete on fixture_ids to authenticated;

insert into fixture_ids values ('user_a', (select tests.create_user('previews-a@muvuca.test')));
insert into fixture_ids values ('user_b', (select tests.create_user('previews-b@muvuca.test')));

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

-- 1. Insert of a link creates a pending link_previews row (trigger).
with new_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'A Link', 'https://a.example/basic', 'https://a.example/basic')
  returning id
)
insert into fixture_ids select 'item_a', id from new_item;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_a')),
  'pending',
  'inserting a link item creates a pending link_previews row via trigger'
);

-- 2/3. Insert of a prompt/code_component does NOT create a row.
with new_prompt as (
  insert into public.library_items (user_id, type, title, content)
  values ((select auth.uid()), 'prompt', 'A Prompt', 'Do something useful.')
  returning id
)
insert into fixture_ids select 'item_prompt', id from new_prompt;

select is(
  (select count(*)::int from public.link_previews where item_id = (select id from fixture_ids where label = 'item_prompt')),
  0,
  'inserting a prompt item does not create a link_previews row'
);

with new_code as (
  insert into public.library_items (user_id, type, title, content)
  values ((select auth.uid()), 'code_component', 'A Snippet', 'export const x = 1;')
  returning id
)
insert into fixture_ids select 'item_code', id from new_code;

select is(
  (select count(*)::int from public.link_previews where item_id = (select id from fixture_ids where label = 'item_code')),
  0,
  'inserting a code_component item does not create a link_previews row'
);

-- Switch to B and attempt every read/write against A's link_previews row.
select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select count(*)::int from public.link_previews where item_id = (select id from fixture_ids where label = 'item_a')),
  0,
  'B cannot select A''s link_previews row via RLS'
);

with upd as (
  update public.link_previews set error_code = 'hacked-by-b'
  where item_id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'B cannot update A''s link_previews row via RLS'
);

with del as (
  delete from public.link_previews
  where item_id = (select id from fixture_ids where label = 'item_a')
  returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'B cannot delete A''s link_previews row via RLS'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(6)),
  0,
  'claim_preview_jobs for B does not return A''s job'
);

select throws_ok(
  format(
    $sql$select public.complete_preview_job(%L::uuid, 'failed'::public.preview_status, 'timeout')$sql$,
    (select id from fixture_ids where label = 'item_a')
  ),
  'preview não encontrado',
  'complete_preview_job for B on A''s item raises preview não encontrado'
);

select throws_ok(
  format($sql$select public.request_preview_refresh(%L::uuid)$sql$,
         (select id from fixture_ids where label = 'item_a')),
  'preview não encontrado',
  'request_preview_refresh for B on A''s item raises preview não encontrado'
);

-- Lease: back to A. Claiming item_a's job advances next_attempt_at past
-- now(), so an immediate second claim call cannot see it again.
select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select lives_ok(
  format($sql$select public.request_preview_refresh(%L::uuid)$sql$,
         (select id from fixture_ids where label = 'item_a')),
  'request_preview_refresh succeeds for A on her own item'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(1)),
  1,
  'claim_preview_jobs returns exactly one leased job'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(1)),
  0,
  'a job already leased is not returned by an immediate second claim'
);

-- Update of `title` alone must NOT re-enqueue (column-level trigger only
-- fires on `normalized_url`). Seed a non-default state first so an
-- unwanted reset would be observable.
with new_title_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Title Item', 'https://a.example/title', 'https://a.example/title')
  returning id
)
insert into fixture_ids select 'item_title', id from new_title_item;

update public.link_previews
   set status = 'failed', attempts = 2, error_code = 'timeout'
 where item_id = (select id from fixture_ids where label = 'item_title');

update public.library_items set title = 'Renamed Title Item'
 where id = (select id from fixture_ids where label = 'item_title');

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_title')),
  'failed',
  'updating only title does not re-enqueue the preview job'
);

select is(
  (select error_code from public.link_previews where item_id = (select id from fixture_ids where label = 'item_title')),
  'timeout',
  'updating only title leaves error_code untouched'
);

-- Update of `normalized_url` DOES re-enqueue with attempts reset to 0.
with new_reurl_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Reurl Item', 'https://a.example/reurl', 'https://a.example/reurl')
  returning id
)
insert into fixture_ids select 'item_reurl', id from new_reurl_item;

update public.link_previews
   set status = 'ready', attempts = 5, error_code = 'previous_error', next_attempt_at = now() + interval '30 days'
 where item_id = (select id from fixture_ids where label = 'item_reurl');

update public.library_items
   set url = 'https://a.example/reurl-changed', normalized_url = 'https://a.example/reurl-changed'
 where id = (select id from fixture_ids where label = 'item_reurl');

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reurl')),
  'pending',
  'updating normalized_url re-enqueues the job as pending'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reurl')),
  0::smallint,
  'updating normalized_url resets attempts to 0'
);

select is(
  (select error_code from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reurl')),
  null::text,
  'updating normalized_url clears error_code'
);

-- Backoff: 1st transient failure -> pending, attempts = 1. 3rd -> failed,
-- attempts = 3 (retry policy table, 0023_link_previews.sql).
with new_backoff_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Backoff Item', 'https://a.example/backoff', 'https://a.example/backoff')
  returning id
)
insert into fixture_ids select 'item_backoff', id from new_backoff_item;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_backoff'),
    'failed'::public.preview_status,
    'timeout'
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_backoff')),
  'pending',
  '1st transient failure reschedules the job as pending'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_backoff')),
  1::smallint,
  '1st transient failure sets attempts to 1'
);

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_backoff'),
    'failed'::public.preview_status,
    'timeout'
  );
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_backoff'),
    'failed'::public.preview_status,
    'timeout'
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_backoff')),
  'failed',
  '3rd transient failure marks the job failed (no more retries)'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_backoff')),
  3::smallint,
  '3rd transient failure sets attempts to 3'
);

-- Permanent error (blocked_private_ip): failed on the 1st attempt, never
-- rescheduled back to pending.
with new_permanent_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Permanent Item', 'https://a.example/permanent', 'https://a.example/permanent')
  returning id
)
insert into fixture_ids select 'item_permanent', id from new_permanent_item;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_permanent'),
    'failed'::public.preview_status,
    'blocked_private_ip'
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_permanent')),
  'failed',
  'a permanent error (blocked_private_ip) fails on the first attempt'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_permanent')),
  1::smallint,
  'a permanent error does not accumulate extra retry attempts'
);

select is(
  (select error_code from public.link_previews where item_id = (select id from fixture_ids where label = 'item_permanent')),
  'blocked_private_ip',
  'a permanent error is never rescheduled back to pending'
);

-- Regression: a NULL p_error_code must NOT be silently treated as a
-- permanent error. `p_error_code not in (...)` alone evaluates to SQL
-- NULL (neither true nor false) when p_error_code is NULL, which would
-- skip the reschedule-to-pending branch entirely and leave the job stuck
-- 'failed' without ever having matched a real permanent-error code. The
-- RPC wraps that comparison in `coalesce(p_error_code, '')` specifically
-- to keep this case retryable like any other transient failure.
with new_null_error_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Null Error Item', 'https://a.example/null-error', 'https://a.example/null-error')
  returning id
)
insert into fixture_ids select 'item_null_error', id from new_null_error_item;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_null_error'),
    'failed'::public.preview_status
    -- p_error_code omitted -> NULL
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_null_error')),
  'pending',
  'a NULL error_code is treated as transient (rescheduled to pending), not silently permanent'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_null_error')),
  1::smallint,
  'a NULL error_code still counts as a normal retry attempt'
);

-- Periodic refresh reclaim: claim_preview_jobs also
-- reclaims 'ready' rows whose 30-day next_attempt_at elapsed, and
-- transient-exhausted 'failed' rows once their own cool-down elapsed --
-- but never a permanent-error 'failed' row, no matter how overdue.
with new_refresh_recent as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Refresh Recent Item', 'https://a.example/refresh-recent', 'https://a.example/refresh-recent')
  returning id
)
insert into fixture_ids select 'item_refresh_recent', id from new_refresh_recent;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_refresh_recent'),
    'ready'::public.preview_status
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_refresh_recent')),
  'ready',
  'a successful refresh leaves the preview ready'
);

select ok(
  (select next_attempt_at > now() + interval '29 days'
     from public.link_previews
    where item_id = (select id from fixture_ids where label = 'item_refresh_recent')),
  'a successful refresh schedules the next refresh ~30 days out'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(6)
    where item_id = (select id from fixture_ids where label = 'item_refresh_recent')),
  0,
  'a just-refreshed ready preview is not reclaimed before its 30-day window elapses'
);

-- Backdate as if the 30-day window had already elapsed.
update public.link_previews
   set next_attempt_at = now() - interval '1 minute'
 where item_id = (select id from fixture_ids where label = 'item_refresh_recent');

select is(
  (select count(*)::int from public.claim_preview_jobs(6)
    where item_id = (select id from fixture_ids where label = 'item_refresh_recent')),
  1,
  'a ready preview past its next_attempt_at is reclaimed by claim_preview_jobs'
);

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_refresh_recent')),
  'pending',
  'reclaiming a due ready preview flips it back to pending'
);

with new_permanent_due as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Permanent Due Item', 'https://a.example/permanent-due', 'https://a.example/permanent-due')
  returning id
)
insert into fixture_ids select 'item_permanent_due', id from new_permanent_due;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_permanent_due'),
    'failed'::public.preview_status,
    'blocked_private_ip'
  );
end;
$$;

update public.link_previews
   set next_attempt_at = now() - interval '60 days'
 where item_id = (select id from fixture_ids where label = 'item_permanent_due');

select is(
  (select count(*)::int from public.claim_preview_jobs(6)
    where item_id = (select id from fixture_ids where label = 'item_permanent_due')),
  0,
  'a permanent-error failed preview is never reclaimed, even long overdue'
);

-- invalid_content_type is permanent in
-- lib/metadata/errors.ts's isPermanent() but was missing from this RPC's
-- own permanent list before 0023_link_previews_permanent_error_parity.sql
-- -- so it kept getting silently rescheduled and reclaimed every 30-day
-- cool-down instead of staying failed for good, same as blocked_private_ip
-- above.
with new_invalid_content_type_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Invalid Content Type Item', 'https://a.example/invalid-content-type', 'https://a.example/invalid-content-type')
  returning id
)
insert into fixture_ids select 'item_invalid_content_type', id from new_invalid_content_type_item;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_invalid_content_type'),
    'failed'::public.preview_status,
    'invalid_content_type'
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_invalid_content_type')),
  'failed',
  'invalid_content_type fails on the first attempt, matching isPermanent() on the TypeScript side'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_invalid_content_type')),
  1::smallint,
  'invalid_content_type does not accumulate extra retry attempts'
);

update public.link_previews
   set next_attempt_at = now() - interval '60 days'
 where item_id = (select id from fixture_ids where label = 'item_invalid_content_type');

select is(
  (select count(*)::int from public.claim_preview_jobs(6)
    where item_id = (select id from fixture_ids where label = 'item_invalid_content_type')),
  0,
  'an invalid_content_type failed preview is never reclaimed, even long overdue'
);

with new_transient_exhausted as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Transient Exhausted Item', 'https://a.example/transient-exhausted', 'https://a.example/transient-exhausted')
  returning id
)
insert into fixture_ids select 'item_transient_exhausted', id from new_transient_exhausted;

do $$
begin
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_transient_exhausted'),
    'failed'::public.preview_status,
    'timeout'
  );
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_transient_exhausted'),
    'failed'::public.preview_status,
    'timeout'
  );
  perform public.complete_preview_job(
    (select id from fixture_ids where label = 'item_transient_exhausted'),
    'failed'::public.preview_status,
    'timeout'
  );
end;
$$;

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_transient_exhausted')),
  'failed',
  'sanity: 3 transient failures leave the preview failed before the reclaim test'
);

update public.link_previews
   set next_attempt_at = now() - interval '1 minute'
 where item_id = (select id from fixture_ids where label = 'item_transient_exhausted');

select is(
  (select count(*)::int from public.claim_preview_jobs(6)
    where item_id = (select id from fixture_ids where label = 'item_transient_exhausted')),
  1,
  'a transient-exhausted failed preview past its cool-down is reclaimed for one more try'
);

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_transient_exhausted')),
  'pending',
  'reclaiming a due transient-exhausted preview flips it back to pending'
);

-- count_claimable_preview_jobs() must apply the exact same eligibility
-- window as claim_preview_jobs(): previously the
-- app computed `remaining` itself and only looked at `status = 'pending'`,
-- so overdue `ready`/transient-exhausted `failed` rows appeared abandoned
-- once a drain batch didn't cover them all. Asserted via a before/after
-- delta rather than an absolute count, since earlier fixtures above also
-- contribute to A's claimable set at this point in the file.
with new_count_check as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Count Check Item', 'https://a.example/count-check', 'https://a.example/count-check')
  returning id
)
insert into fixture_ids select 'item_count_check', id from new_count_check;

-- Leased into the future (mirrors a row claim_preview_jobs just claimed) --
-- must not count as claimable yet.
update public.link_previews
   set next_attempt_at = now() + interval '2 minutes'
 where item_id = (select id from fixture_ids where label = 'item_count_check');

create temporary table count_check_before as
select public.count_claimable_preview_jobs() as n;

update public.link_previews
   set next_attempt_at = now() - interval '1 minute'
 where item_id = (select id from fixture_ids where label = 'item_count_check');

select is(
  (select public.count_claimable_preview_jobs()),
  (select n + 1 from count_check_before),
  'count_claimable_preview_jobs increases by exactly 1 once a leased-into-the-future row becomes due, matching claim_preview_jobs eligibility'
);

-- Deleting the item cascades and removes the link_previews row.
with new_delete_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Delete Item', 'https://a.example/delete', 'https://a.example/delete')
  returning id
)
insert into fixture_ids select 'item_delete', id from new_delete_item;

delete from public.library_items where id = (select id from fixture_ids where label = 'item_delete');

select is(
  (select count(*)::int from public.link_previews where item_id = (select id from fixture_ids where label = 'item_delete')),
  0,
  'deleting the item removes its link_previews row via cascade'
);

-- The ids filter on claim_preview_jobs/request_preview_reschedule_for_items
-- (0024_scoped_preview_queue.sql) is scope convenience, never authorization
-- -- RLS on link_previews must still deny B even when B supplies A's item
-- ids explicitly.
with new_reschedule_denial_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Reschedule Denial Item', 'https://a.example/reschedule-denial', 'https://a.example/reschedule-denial')
  returning id
)
insert into fixture_ids select 'item_reschedule_denial', id from new_reschedule_denial_item;

-- Due (past), not future: is_preview_job_claimable requires
-- next_attempt_at <= now(), so a future lease would make
-- claim_preview_jobs(6, ids) return 0 for anyone, owner included -- proving
-- nothing about RLS. Due makes the row genuinely claimable by its owner, so
-- B getting 0 here is actually load-bearing on ownership, not on timing.
update public.link_previews
   set status = 'failed', attempts = 2, error_code = 'timeout', next_attempt_at = now() - interval '1 minute'
 where item_id = (select id from fixture_ids where label = 'item_reschedule_denial');

select tests.authenticate_as((select id from fixture_ids where label = 'user_b'));

select is(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_reschedule_denial')]
  )),
  0,
  'B rescheduling A''s item via the ids filter reschedules 0 rows'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(
    6, array[(select id from fixture_ids where label = 'item_reschedule_denial')]
  )),
  0,
  'B claiming A''s item via the ids filter claims 0 rows'
);

select tests.authenticate_as((select id from fixture_ids where label = 'user_a'));

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reschedule_denial')),
  'failed',
  'A''s status is unchanged after B''s denied reschedule/claim attempts'
);

select is(
  (select attempts from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reschedule_denial')),
  2::smallint,
  'A''s attempts is unchanged after B''s denied reschedule/claim attempts'
);

select is(
  (select error_code from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reschedule_denial')),
  'timeout',
  'A''s error_code is unchanged after B''s denied reschedule/claim attempts'
);

select is(
  (select next_attempt_at from public.link_previews where item_id = (select id from fixture_ids where label = 'item_reschedule_denial')),
  (select now() - interval '1 minute'),
  'A''s next_attempt_at is unchanged after B''s denied reschedule/claim attempts'
);

-- request_preview_reschedule_for_items must never touch a 'ready' row that
-- HAS a thumbnail: the periodic 30-day refresh and the per-item "Atualizar
-- prévia" already cover it, and batch-rescheduling it would throw away a
-- good cached preview.
with new_ready_reschedule_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Ready Reschedule Item', 'https://a.example/ready-reschedule', 'https://a.example/ready-reschedule')
  returning id
)
insert into fixture_ids select 'item_ready_reschedule', id from new_ready_reschedule_item;

update public.link_previews
   set status = 'ready', attempts = 0, error_code = null, next_attempt_at = now() + interval '25 days',
       thumbnail_hash = repeat('a', 64), thumbnail_width = 640, thumbnail_height = 360
 where item_id = (select id from fixture_ids where label = 'item_ready_reschedule');

select is(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_ready_reschedule')]
  )),
  0,
  'request_preview_reschedule_for_items reschedules 0 rows for a ready item that has a thumbnail'
);

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_ready_reschedule')),
  'ready',
  'a ready row with a thumbnail stays ready after request_preview_reschedule_for_items'
);

-- 20260827000000_0026_reschedule_ready_missing_thumbnail.sql: a 'ready' row
-- with NO thumbnail_hash (enrichOne finishes 'ready' even when the
-- thumbnail fetch failed transiently -- see lib/metadata/enrich.ts) is
-- exactly the card the "Atualizar pré-visualizações" button is meant to
-- fix, so it MUST be rescheduled unlike the thumbnailed case above.
with new_ready_no_thumbnail_item as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Ready No Thumbnail Item', 'https://a.example/ready-no-thumbnail', 'https://a.example/ready-no-thumbnail')
  returning id
)
insert into fixture_ids select 'item_ready_no_thumbnail', id from new_ready_no_thumbnail_item;

update public.link_previews
   set status = 'ready', attempts = 0, error_code = null, next_attempt_at = now() + interval '25 days',
       thumbnail_hash = null, thumbnail_width = null, thumbnail_height = null
 where item_id = (select id from fixture_ids where label = 'item_ready_no_thumbnail');

select is(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_ready_no_thumbnail')]
  )),
  1,
  'request_preview_reschedule_for_items reschedules a ready row that has no thumbnail_hash'
);

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_ready_no_thumbnail')),
  'pending',
  'a ready row with no thumbnail_hash goes back to pending after request_preview_reschedule_for_items'
);

-- request_preview_reschedule_for_items must never touch a 'failed' row
-- whose error_code is one of the 7 permanent codes (same set as
-- is_preview_job_claimable() / isPermanent() in lib/metadata/errors.ts,
-- canonicalized by 20260819010000_0023_link_previews_permanent_error_parity.sql).
-- Batch-rescheduling any of these would silently retry a URL the fetcher
-- has already determined can never succeed.
do $$
declare
  v_code text;
  v_item_id uuid;
begin
  foreach v_code in array array[
    'blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone',
    'invalid_content_type', 'image_rejected', 'decode_failed'
  ]
  loop
    insert into public.library_items (user_id, type, title, url, normalized_url)
    values (
      (select auth.uid()), 'link', 'Permanent Reschedule ' || v_code,
      'https://a.example/permanent-reschedule-' || v_code,
      'https://a.example/permanent-reschedule-' || v_code
    )
    returning id into v_item_id;

    insert into fixture_ids (label, id) values ('item_permanent_reschedule_' || v_code, v_item_id);

    update public.link_previews
       set status = 'failed', attempts = 1, error_code = v_code, next_attempt_at = now() + interval '1 hour'
     where item_id = v_item_id;
  end loop;
end;
$$;

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_blocked_private_ip')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'blocked_private_ip' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_blocked_private_ip')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code blocked_private_ip'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_blocked_scheme')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'blocked_scheme' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_blocked_scheme')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code blocked_scheme'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_blocked_host')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'blocked_host' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_blocked_host')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code blocked_host'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_http_gone')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'http_gone' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_http_gone')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code http_gone'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_invalid_content_type')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'invalid_content_type' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_invalid_content_type')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code invalid_content_type'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_image_rejected')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'image_rejected' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_image_rejected')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code image_rejected'
);

select ok(
  (select public.request_preview_reschedule_for_items(
    array[(select id from fixture_ids where label = 'item_permanent_reschedule_decode_failed')]
  ) = 0)
  and (
    select status = 'failed' and error_code = 'decode_failed' and attempts = 1::smallint
      from public.link_previews
     where item_id = (select id from fixture_ids where label = 'item_permanent_reschedule_decode_failed')
  ),
  'request_preview_reschedule_for_items does not touch a failed row with permanent error_code decode_failed'
);

-- count_claimable_preview_jobs(ids) must count exactly what
-- claim_preview_jobs(6, ids) dequeues for the same explicit id set (same
-- parity guarantee as the unscoped pair above, now proven under the ids
-- filter too).
with new_scope_claimable_1 as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Scope Claimable 1', 'https://a.example/scope-claimable-1', 'https://a.example/scope-claimable-1')
  returning id
)
insert into fixture_ids select 'item_scope_claimable_1', id from new_scope_claimable_1;

with new_scope_claimable_2 as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Scope Claimable 2', 'https://a.example/scope-claimable-2', 'https://a.example/scope-claimable-2')
  returning id
)
insert into fixture_ids select 'item_scope_claimable_2', id from new_scope_claimable_2;

with new_scope_not_claimable as (
  insert into public.library_items (user_id, type, title, url, normalized_url)
  values ((select auth.uid()), 'link', 'Scope Not Claimable', 'https://a.example/scope-not-claimable', 'https://a.example/scope-not-claimable')
  returning id
)
insert into fixture_ids select 'item_scope_not_claimable', id from new_scope_not_claimable;

update public.link_previews
   set status = 'failed', error_code = 'blocked_host', attempts = 1, next_attempt_at = now() - interval '1 minute'
 where item_id = (select id from fixture_ids where label = 'item_scope_not_claimable');

select is(
  (select public.count_claimable_preview_jobs(array[
    (select id from fixture_ids where label = 'item_scope_claimable_1'),
    (select id from fixture_ids where label = 'item_scope_claimable_2'),
    (select id from fixture_ids where label = 'item_scope_not_claimable')
  ])),
  2,
  'count_claimable_preview_jobs(ids) counts only the claimable items in the given scope'
);

select is(
  (select count(*)::int from public.claim_preview_jobs(6, array[
    (select id from fixture_ids where label = 'item_scope_claimable_1'),
    (select id from fixture_ids where label = 'item_scope_claimable_2'),
    (select id from fixture_ids where label = 'item_scope_not_claimable')
  ])),
  2,
  'claim_preview_jobs(6, ids) dequeues exactly the same count that count_claimable_preview_jobs(ids) reported'
);

select is(
  (select count(*)::int from public.link_previews
    where item_id in (
      (select id from fixture_ids where label = 'item_scope_claimable_1'),
      (select id from fixture_ids where label = 'item_scope_claimable_2')
    )
    and status = 'pending'
    and next_attempt_at > now()),
  2,
  'both scoped items claimed are leased (next_attempt_at advanced past now())'
);

select is(
  (select public.count_claimable_preview_jobs(array[
    (select id from fixture_ids where label = 'item_scope_claimable_1'),
    (select id from fixture_ids where label = 'item_scope_claimable_2'),
    (select id from fixture_ids where label = 'item_scope_not_claimable')
  ])),
  0,
  'count_claimable_preview_jobs(ids) drops to 0 once claim_preview_jobs(ids) has leased every claimable item in scope'
);

select is(
  (select status::text from public.link_previews where item_id = (select id from fixture_ids where label = 'item_scope_not_claimable')),
  'failed',
  'the permanent-error item in scope is never claimed by claim_preview_jobs(ids)'
);

-- reset_account() removes every remaining link_previews row for the user.
-- Run last: it wipes all of A's library_items (and therefore every
-- link_previews row still standing from the tests above).
do $$
begin
  perform public.reset_account();
end;
$$;

select is(
  (select count(*)::int from public.link_previews where user_id = (select id from fixture_ids where label = 'user_a')),
  0,
  'reset_account removes every link_previews row for the user'
);

select * from finish();

rollback;

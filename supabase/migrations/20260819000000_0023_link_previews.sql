-- Link previews: enrichment queue, RPCs and private Storage bucket for
-- thumbnail/favicon objects.
--
-- `link_previews` is keyed 1:1 by `item_id` -- the row only ever exists for
-- an item of type 'link', enqueued/reset by the `library_items` trigger
-- below. Thumbnail/favicon are stored as a content-addressed sha256 `hash`,
-- never a path: the Storage object key is always reconstructed as
-- `${user_id}/${item_id}/t_${hash}.webp` (thumbnail) or `i_${hash}.webp`
-- (favicon) by the Route Handler that serves it, from auth.uid() + item_id
-- + the hash read under RLS -- the hex-format check constraint on both
-- hash columns closes the door on path traversal via a crafted hash value.
--
-- RLS follows 0007_rls.sql's pattern exactly: enable + force, revoke all
-- from anon, 4 owner-scoped policies with `(select auth.uid()) = user_id`.
-- Every function is `security invoker` + `set search_path = ''`, schema
-- -qualified -- never `security definer`.

create type public.preview_status as enum ('pending', 'ready', 'failed');
create type public.preview_source as enum ('og_image', 'twitter_image', 'none');

create table public.link_previews (
  item_id uuid primary key,
  user_id uuid not null,

  status public.preview_status not null default 'pending',
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  fetched_at timestamptz,
  error_code text,

  remote_title text,
  remote_description text,
  site_name text,

  thumbnail_hash text,
  thumbnail_width int,
  thumbnail_height int,
  thumbnail_source public.preview_source not null default 'none',
  favicon_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint link_previews_item_user_fkey
    foreign key (item_id, user_id)
    references public.library_items (id, user_id) on delete cascade,

  constraint link_previews_attempts_range check (attempts between 0 and 10),
  constraint link_previews_error_code_length check (error_code is null or char_length(error_code) <= 40),
  constraint link_previews_remote_title_length check (remote_title is null or char_length(remote_title) <= 240),
  constraint link_previews_remote_description_length check (remote_description is null or char_length(remote_description) <= 500),
  constraint link_previews_site_name_length check (site_name is null or char_length(site_name) <= 120),
  constraint link_previews_thumbnail_hash_format check (thumbnail_hash is null or thumbnail_hash ~ '^[0-9a-f]{64}$'),
  constraint link_previews_favicon_hash_format check (favicon_hash is null or favicon_hash ~ '^[0-9a-f]{64}$'),
  constraint link_previews_thumbnail_dimensions check (
    (thumbnail_hash is null and thumbnail_width is null and thumbnail_height is null)
    or (thumbnail_hash is not null and thumbnail_width between 1 and 4000 and thumbnail_height between 1 and 4000)
  )
);

create index link_previews_queue_idx
  on public.link_previews (user_id, next_attempt_at)
  where status in ('pending', 'ready', 'failed');

create index link_previews_user_id_idx on public.link_previews (user_id);

create trigger link_previews_set_updated_at
  before update on public.link_previews
  for each row execute function public.set_updated_at();

alter table public.link_previews enable row level security;
alter table public.link_previews force row level security;
revoke all on public.link_previews from anon;
grant select, insert, update, delete on public.link_previews to authenticated;

create policy link_previews_select on public.link_previews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy link_previews_insert on public.link_previews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy link_previews_update on public.link_previews
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy link_previews_delete on public.link_previews
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Automatic enqueue trigger: covers create/update/import/restore for free,
-- since every path that inserts or changes a link's normalized_url already
-- routes through this table's row-level trigger. Re-saving unrelated fields
-- (title, description, tags) must NOT reset the queue entry -- only an
-- actual URL change or a brand-new link does.
create function public.enqueue_link_preview()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.type <> 'link' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.normalized_url is not distinct from old.normalized_url then
    return new;
  end if;

  insert into public.link_previews (item_id, user_id)
  values (new.id, new.user_id)
  on conflict (item_id) do update
    set status = 'pending',
        attempts = 0,
        next_attempt_at = now(),
        error_code = null;

  return new;
end;
$$;

create trigger library_items_enqueue_preview
  after insert or update of normalized_url on public.library_items
  for each row execute function public.enqueue_link_preview();

-- Backfill: every existing link gets a pending preview row so the queue
-- picks up the entire pre-existing library without any external
-- script/request -- the database never initiates outbound network calls.
insert into public.link_previews (item_id, user_id)
select li.id, li.user_id from public.library_items li where li.type = 'link'
on conflict (item_id) do nothing;

-- Shared eligibility predicate: a row is claimable when its lease/backoff
-- has elapsed and it's 'pending'/'ready', or a 'failed' row whose
-- error_code isn't one of the permanent ones (blocked_scheme/blocked_host/
-- blocked_private_ip/http_gone). Both `claim_preview_jobs` and
-- `count_claimable_preview_jobs` call this instead of repeating the WHERE
-- clause, so the app-facing "how many jobs are left" count can never drift
-- from what claim_preview_jobs actually dequeues. An earlier version
-- computed `remaining` app-side and only looked at 'pending' rows, so
-- overdue 'ready'/transient-exhausted 'failed' rows past a single batch
-- looked abandoned even though claim_preview_jobs would still pick them up.
create function public.is_preview_job_claimable(
  p_status public.preview_status,
  p_error_code text,
  p_next_attempt_at timestamptz
) returns boolean
language sql stable security invoker set search_path = ''
as $$
  select p_next_attempt_at <= now()
     and (
       p_status in ('pending', 'ready')
       or (
         p_status = 'failed'
         and coalesce(p_error_code, '') not in (
           'blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone'
         )
       )
     );
$$;

grant execute on function public.is_preview_job_claimable(public.preview_status, text, timestamptz) to authenticated;

-- RPC 1: claim_preview_jobs -- lease-based dequeue (2 min lease, skip
-- locked so concurrent drains never claim the same row), capped at 6 jobs
-- per call to bound egress per invocation.
--
-- Reclaim: the queue is not only 'pending' rows. A 'ready' row whose
-- next_attempt_at elapsed (30-day periodic refresh) and a transient-
-- exhausted 'failed' row (3rd attempt, error_code not a permanent one)
-- whose 30-day cool-down elapsed are both eligible too -- the retry-policy
-- table below always sets next_attempt_at even for those two cases
-- specifically so this claim can pick them back up later. Both flip to
-- 'pending' atomically as part of the same claim UPDATE -- without this,
-- `ready`/exhausted `failed` rows could only ever reach
-- `complete_preview_job` via a manual "Atualizar prévia" click.
-- Permanent-error 'failed' rows (blocked_scheme/blocked_host/
-- blocked_private_ip/http_gone) are excluded and never reclaimed.
create function public.claim_preview_jobs(p_limit int default 6)
returns table (item_id uuid, url text, attempts smallint)
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 6), 1), 6);
begin
  return query
  with claimed as (
    update public.link_previews lp
       set status = 'pending',
           next_attempt_at = now() + interval '2 minutes',
           updated_at = now()
     where lp.item_id in (
       select inner_lp.item_id
         from public.link_previews inner_lp
        where public.is_preview_job_claimable(
                inner_lp.status, inner_lp.error_code, inner_lp.next_attempt_at
              )
        order by inner_lp.next_attempt_at
        limit v_limit
        for update skip locked
     )
    returning lp.item_id, lp.attempts
  )
  select c.item_id, li.url, c.attempts
    from claimed c
    join public.library_items li on li.id = c.item_id
   where li.url is not null;
end;
$$;

grant execute on function public.claim_preview_jobs(int) to authenticated;

-- RPC: count_claimable_preview_jobs -- same eligibility predicate as
-- claim_preview_jobs above, scoped to the caller by RLS. Lets
-- drainPreviewQueue() report an accurate `remaining` count across multiple
-- batches without duplicating the eligibility rule in application code.
create function public.count_claimable_preview_jobs()
returns int
language sql stable security invoker set search_path = ''
as $$
  select count(*)::int
    from public.link_previews lp
   where public.is_preview_job_claimable(lp.status, lp.error_code, lp.next_attempt_at);
$$;

grant execute on function public.count_claimable_preview_jobs() to authenticated;

-- RPC 2: complete_preview_job -- writes the job outcome, computes the
-- retry/backoff schedule (see table below), and hands back the previous
-- thumbnail/favicon hash so the caller can best-effort clean up the
-- orphaned Storage object.
--
-- Retry policy:
--   1st transient failure -> +15 min,  status stays 'pending'
--   2nd                   -> +2 h,     status stays 'pending'
--   3rd                   -> +30 days, status becomes 'failed' (reclaimed
--                            by claim_preview_jobs once next_attempt_at
--                            elapses, same as the periodic refresh below)
--   success                -> +30 days, status 'ready' (periodic refresh,
--                            reclaimed by claim_preview_jobs once elapsed)
--   permanent error (blocked_scheme/blocked_host/blocked_private_ip/
--     http_gone) -> +30 days, 'failed' immediately, never retried
--     (claim_preview_jobs explicitly excludes these error_codes)
create function public.complete_preview_job(
  p_item_id uuid,
  p_status public.preview_status,
  p_error_code text default null,
  p_remote_title text default null,
  p_remote_description text default null,
  p_site_name text default null,
  p_thumbnail_hash text default null,
  p_thumbnail_width int default null,
  p_thumbnail_height int default null,
  p_thumbnail_source public.preview_source default 'none',
  p_favicon_hash text default null
) returns table (previous_thumbnail_hash text, previous_favicon_hash text)
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_prev_thumb text;
  v_prev_icon text;
  v_attempts smallint;
begin
  if p_status = 'pending' then
    raise exception 'status inválido';
  end if;

  select lp.thumbnail_hash, lp.favicon_hash, lp.attempts
    into v_prev_thumb, v_prev_icon, v_attempts
    from public.link_previews lp
   where lp.item_id = p_item_id;

  if not found then
    raise exception 'preview não encontrado';
  end if;

  update public.link_previews lp
     set status = p_status,
         attempts = case when p_status = 'ready' then 0 else lp.attempts + 1 end,
         fetched_at = now(),
         error_code = p_error_code,
         remote_title = p_remote_title,
         remote_description = p_remote_description,
         site_name = p_site_name,
         thumbnail_hash = p_thumbnail_hash,
         thumbnail_width = p_thumbnail_width,
         thumbnail_height = p_thumbnail_height,
         thumbnail_source = p_thumbnail_source,
         favicon_hash = p_favicon_hash,
         next_attempt_at = case
           when p_status = 'ready' then now() + interval '30 days'
           when lp.attempts + 1 >= 3 then now() + interval '30 days'
           when lp.attempts + 1 = 1 then now() + interval '15 minutes'
           else now() + interval '2 hours'
         end
   where lp.item_id = p_item_id;

  update public.link_previews lp
     set status = 'pending'
   where lp.item_id = p_item_id
     and p_status = 'failed'
     and lp.attempts < 3
     -- coalesce() so a null p_error_code can't silently short-circuit this
     -- to NULL (neither true nor false) and leave the job stuck 'failed'
     -- without ever having been classified as a real permanent error.
     -- Unreachable from enrichOne today (it always returns a code), but
     -- this RPC is `grant execute to authenticated` and Tasks 4/5 also
     -- call it -- hardening, not a behavior change for any current input.
     and coalesce(p_error_code, '') not in ('blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone');

  return query
    select v_prev_thumb, v_prev_icon;
end;
$$;

grant execute on function public.complete_preview_job(uuid, public.preview_status, text, text, text, text, text, int, int, public.preview_source, text) to authenticated;

-- RPC 3: request_preview_refresh -- manual "refresh preview" action,
-- consumed by the item card's UI; created here alongside the rest of the queue.
create function public.request_preview_refresh(p_item_id uuid)
returns void
language plpgsql volatile security invoker set search_path = ''
as $$
begin
  update public.link_previews
     set status = 'pending', attempts = 0, next_attempt_at = now(), error_code = null
   where item_id = p_item_id;
  if not found then
    raise exception 'preview não encontrado';
  end if;
end;
$$;
grant execute on function public.request_preview_refresh(uuid) to authenticated;

-- Storage: private bucket for preview thumbnails/favicons, gated by
-- prefix-based owner policies mirroring the table RLS above. Only WebP is
-- ever accepted (`image.ts`'s pipeline output format); 1 MiB caps a single
-- object (thumbnails/favicons are always small after the resize pipeline).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('link-previews', 'link-previews', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

create policy link_previews_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'link-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy link_previews_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'link-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy link_previews_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'link-previews' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'link-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy link_previews_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'link-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

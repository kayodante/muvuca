-- lib/metadata/fetch.ts now distinguishes a 404 (http_not_found) from every
-- other non-2xx/3xx status (http_error): a 404 means the resource is gone
-- for good, while a generic http_error also covers a 403 from a site that
-- is alive and simply blocks bots (Medium, GitHub, etc.) and must stay
-- retryable. isPermanent() in lib/metadata/errors.ts classifies
-- http_not_found as permanent alongside the existing 7 codes.
--
-- Re-created here with the exact same signatures/bodies as their most
-- recent versions -- is_preview_job_claimable/complete_preview_job from
-- 20260819010000_0023_link_previews_permanent_error_parity.sql,
-- request_preview_reschedule_for_items from
-- 20260827000000_0026_reschedule_ready_missing_thumbnail.sql (keeping its
-- `status <> 'ready' or thumbnail_hash is null` clause) -- except each
-- permanent-error list grows from 7 to 8 entries with 'http_not_found'.
-- request_preview_refresh is untouched on purpose: it never filters by
-- error code, staying the manual per-item escape hatch regardless of
-- permanence. lib/metadata/__tests__/permanent-error-sync.test.ts keeps all
-- three lists here in sync with isPermanent().

create or replace function public.is_preview_job_claimable(
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
           'blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone',
           'http_not_found', 'invalid_content_type', 'image_rejected', 'decode_failed'
         )
       )
     );
$$;

create or replace function public.complete_preview_job(
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
     and coalesce(p_error_code, '') not in (
       'blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone',
       'http_not_found', 'invalid_content_type', 'image_rejected', 'decode_failed'
     );

  return query
    select v_prev_thumb, v_prev_icon;
end;
$$;

create or replace function public.request_preview_reschedule_for_items(p_item_ids uuid[])
returns int
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_count int;
begin
  if p_item_ids is null or cardinality(p_item_ids) = 0 then
    return 0;
  end if;

  with updated as (
    update public.link_previews
       set status = 'pending', attempts = 0, next_attempt_at = now(), error_code = null
     where item_id = any(p_item_ids)
       and (status <> 'ready' or thumbnail_hash is null)
       and coalesce(error_code, '') not in (
         'blocked_private_ip', 'blocked_scheme', 'blocked_host', 'http_gone',
         'http_not_found', 'invalid_content_type', 'image_rejected', 'decode_failed'
       )
    returning 1
  )
  select count(*)::int into v_count from updated;

  return v_count;
end;
$$;

grant execute on function public.request_preview_reschedule_for_items(uuid[]) to authenticated;

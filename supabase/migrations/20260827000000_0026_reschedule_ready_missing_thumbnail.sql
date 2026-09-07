-- The "Atualizar pré-visualizações" button (request_preview_reschedule_for_items,
-- 20260825000000_0024_scoped_preview_queue.sql) skips every row whose status
-- is already 'ready' -- but enrichOne (lib/metadata/enrich.ts) always
-- finishes a job as 'ready' even when the thumbnail/favicon fetch failed
-- transiently (see its class doc comment: a thumbnail failure degrades to
-- `thumbnail: null`, it never fails the job). That leaves exactly the card
-- the user is looking at -- 'ready' with no image -- stuck behind the
-- unconditional `status <> 'ready'` guard for the full 30-day cool-down,
-- immune to the one button meant to fix it.
--
-- Re-created with the exact same signature/body as 0024's version, except
-- the WHERE clause now also reschedules a 'ready' row that has no
-- thumbnail_hash. Accepted trade-off: a site that legitimately has no
-- og:image will get refetched every time this button is clicked for it --
-- acceptable because this is a manual, page-scoped action, not a background
-- sweep. The permanent-error-code list is untouched (same 7 codes as
-- is_preview_job_claimable()/complete_preview_job()/isPermanent() in
-- lib/metadata/errors.ts); lib/metadata/__tests__/permanent-error-sync.test.ts
-- keeps them in sync.

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
         'invalid_content_type', 'image_rejected', 'decode_failed'
       )
    returning 1
  )
  select count(*)::int into v_count from updated;

  return v_count;
end;
$$;

grant execute on function public.request_preview_reschedule_for_items(uuid[]) to authenticated;

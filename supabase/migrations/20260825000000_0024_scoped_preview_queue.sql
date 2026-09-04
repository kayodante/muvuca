-- Scoped preview queue: an optional `p_item_ids` filter on the two queue-
-- read RPCs, plus a batch-reschedule RPC for the "Atualizar pré-visualizações"
-- button. The client-side drainer currently sweeps the WHOLE queue in the
-- background, starving bookmark imports; scoping drains to the items on the
-- currently rendered page fixes that. This migration is the database half
-- only -- Server Actions and UI land separately.
--
-- The ids filter is scope convenience, never authorization: RLS on
-- link_previews stays the only ownership gate, so no user_id check is added
-- inside these functions. Every function stays `security invoker` +
-- `set search_path = ''`, schema-qualified.

drop function if exists public.claim_preview_jobs(int);

-- Idêntica à versão de 0023, com uma única linha nova no WHERE interno:
-- o filtro opcional por ids que escopa a drenagem à página visível.
-- `p_item_ids => null` mantém o comportamento global anterior (usado por
-- testes e por qualquer chamada sem escopo).
create function public.claim_preview_jobs(
  p_limit int default 6,
  p_item_ids uuid[] default null
)
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
          and (p_item_ids is null or inner_lp.item_id = any(p_item_ids))
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

grant execute on function public.claim_preview_jobs(int, uuid[]) to authenticated;

drop function if exists public.count_claimable_preview_jobs();

create function public.count_claimable_preview_jobs(p_item_ids uuid[] default null)
returns int
language sql stable security invoker set search_path = ''
as $$
  select count(*)::int
    from public.link_previews lp
   where public.is_preview_job_claimable(lp.status, lp.error_code, lp.next_attempt_at)
     and (p_item_ids is null or lp.item_id = any(p_item_ids));
$$;

grant execute on function public.count_claimable_preview_jobs(uuid[]) to authenticated;

-- Reagenda em lote as prévias que falharam ou ficaram presas em `pending`
-- na página visível. Deliberadamente NÃO toca em linhas `ready` (o refresh
-- periódico de 30 dias e o "Atualizar prévia" por item já cobrem isso) nem
-- em erros permanentes (blocked_scheme/blocked_host/blocked_private_ip/
-- http_gone/invalid_content_type/image_rejected/decode_failed -- o mesmo
-- conjunto de 7 usado por is_preview_job_claimable() e complete_preview_job()
-- desde 20260819010000_0023_link_previews_permanent_error_parity.sql), que
-- nunca devem voltar à fila por ação em lote.
-- Retorna quantas linhas foram reagendadas, para o feedback da UI.
create function public.request_preview_reschedule_for_items(p_item_ids uuid[])
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
       and status <> 'ready'
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

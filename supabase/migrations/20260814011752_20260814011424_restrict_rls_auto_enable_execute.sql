-- Hosted Supabase creates this event-trigger helper in public to enforce RLS
-- on new tables; the local stack may not. It is infrastructure, not an app RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

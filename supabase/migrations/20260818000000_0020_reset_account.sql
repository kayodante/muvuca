-- "Começar do zero": apaga todo dado de domínio do usuário autenticado,
-- deixando a conta como se tivesse acabado de ser criada. auth.users não é
-- tocado -- a sessão continua válida.
--
-- Ordem de deleção (ver 0007_rls.sql para as policies de cada tabela):
-- 1. library_items -- cascata de FK remove item_tags associados.
-- 2. tags, folha primeiro -- tags_parent_id_user_id_fkey é ON DELETE
--    RESTRICT (0003_tags.sql), então apagar toda a hierarquia num único
--    DELETE falharia se uma linha ainda-não-apagada referenciar outra já
--    apagada na mesma instrução. O loop remove sempre as folhas restantes
--    até esvaziar, que termina em no máximo 6 iterações (profundidade
--    máxima da hierarquia, mesmo limite de 0012_search_library.sql).
-- 3. user_preferences -- sem linha, getThemePreference() volta ao default
--    documentado ("system").
--
-- security invoker: roda com o papel do chamador, então RLS é exatamente
-- tão efetiva aqui quanto numa query direta (mesmo racional de
-- 0009_tag_rpc.sql). user_id nunca vem do payload -- não há payload.
--
-- pg_advisory_xact_lock serializa contra um restore/import concorrente do
-- mesmo usuário (mesmo padrão de 0008_tag_hierarchy.sql e
-- 0018_import_library_backup.sql), liberado automaticamente no commit ou
-- rollback.

-- 0014_user_preferences.sql nunca concedeu delete: nada no produto até
-- agora apagava a própria preferência (só criava/atualizava). RLS forçada
-- nega por padrão sem uma policy de delete, então ambos são necessários.
grant delete on public.user_preferences to authenticated;

create policy user_preferences_delete on public.user_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.reset_account()
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  delete from public.library_items where user_id = (select auth.uid());

  loop
    delete from public.tags
    where user_id = (select auth.uid())
      and id not in (
        select parent_id from public.tags
        where user_id = (select auth.uid()) and parent_id is not null
      );
    get diagnostics v_deleted = row_count;
    exit when v_deleted = 0;
  end loop;

  delete from public.user_preferences where user_id = (select auth.uid());
end;
$$;

grant execute on function public.reset_account() to authenticated;

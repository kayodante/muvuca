-- Foto de perfil (ADR-017, AAA-244). Coluna nula = sem foto. A chave do
-- objeto é content-addressed, `${user_id}/${sha256}.webp`, e sempre
-- reconstruída no servidor a partir do user_id da sessão + hash validado --
-- nunca lida do banco como caminho; o check hex abaixo fecha path
-- traversal via hash malicioso. RLS e grants de 0014/0020 já cobrem a
-- coluna nova, e `reset_account()` apaga a linha inteira, então a foto
-- some junto com o resto da preferência. Bucket privado, só WebP, 256 KiB
-- (a saída de 256x256 do reencode fica na casa das dezenas de KB).
--
-- Este é 0035, não 0034 -- 0034_count_library_items_by_tag.sql já ocupa
-- esse número.

alter table public.user_preferences
  add column avatar_hash text,
  add constraint user_preferences_avatar_hash_valid check (
    avatar_hash is null or avatar_hash ~ '^[0-9a-f]{64}$'
  );

-- Storage: bucket privado para a foto de perfil, espelhando exatamente as
-- 4 policies de `link-previews` (0023_link_previews.sql) por prefixo
-- `${user_id}/...`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 262144, array['image/webp'])
on conflict (id) do nothing;

create policy avatars_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

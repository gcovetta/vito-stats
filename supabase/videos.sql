-- Videos de los goles: espacio privado en Supabase Storage.
-- Solo los usuarios de la app (vos y Vito) pueden ver, subir o borrar videos.
-- Pegalo en SQL Editor → New query → Run. Se puede correr más de una vez.

insert into storage.buckets (id, name, public, file_size_limit)
values ('videos', 'videos', false, 52428800)          -- privado, máximo 50 MB por video
on conflict (id) do update set public = false, file_size_limit = 52428800;

do $$
declare
  cond text := 'bucket_id = ''videos''';
begin
  -- Si ya corriste miembros.sql, exige además estar en la lista de miembros
  if to_regprocedure('public.es_miembro()') is not null then
    cond := cond || ' and public.es_miembro()';
  end if;
  execute 'drop policy if exists "videos_select" on storage.objects';
  execute 'drop policy if exists "videos_insert" on storage.objects';
  execute 'drop policy if exists "videos_update" on storage.objects';
  execute 'drop policy if exists "videos_delete" on storage.objects';
  execute format('create policy "videos_select" on storage.objects for select to authenticated using (%s)', cond);
  execute format('create policy "videos_insert" on storage.objects for insert to authenticated with check (%s)', cond);
  execute format('create policy "videos_update" on storage.objects for update to authenticated using (%s) with check (%s)', cond, cond);
  execute format('create policy "videos_delete" on storage.objects for delete to authenticated using (%s)', cond);
end $$;

-- Acceso de la familia: SOLO MIRAR (no pueden cargar, editar ni borrar nada).
-- Pasos:
--   1) Authentication → Users → Add user: creá UN usuario para la familia
--      (ej: familia.vito@gmail.com) con una contraseña y "Auto Confirm".
--   2) Cambiá el mail de abajo por ese mismo y pegá todo en SQL Editor → Run.
-- Para sumar otro lector más adelante, repetí solo el bloque "Anotar lectores".

-- Rol de cada miembro: 'editor' (vos y Vito) o 'lector' (familia)
alter table public.miembros add column if not exists rol text not null default 'editor';

-- Anotar lectores (cambiá el mail)
insert into public.miembros (user_id, rol)
select id, 'lector' from auth.users where email = 'familia.vito@gmail.com'
on conflict (user_id) do update set rol = 'lector';

-- ¿Quién puede cargar datos? Solo los editores
create or replace function public.es_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where user_id = auth.uid() and rol = 'editor')
$$;
grant execute on function public.es_editor() to authenticated;

-- La app pregunta qué rol tiene quien entró
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select rol from public.miembros where user_id = auth.uid()), 'ninguno')
$$;
grant execute on function public.mi_rol() to authenticated;

-- Datos: todos los miembros miran, solo editores escriben
drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;
create policy "docs_select" on public.docs for select to authenticated using (public.es_miembro());
create policy "docs_insert" on public.docs for insert to authenticated with check (public.es_editor());
create policy "docs_update" on public.docs for update to authenticated using (public.es_editor()) with check (public.es_editor());
create policy "docs_delete" on public.docs for delete to authenticated using (public.es_editor());

-- Videos: todos los miembros los ven, solo editores suben o borran
drop policy if exists "videos_select" on storage.objects;
drop policy if exists "videos_insert" on storage.objects;
drop policy if exists "videos_update" on storage.objects;
drop policy if exists "videos_delete" on storage.objects;
create policy "videos_select" on storage.objects for select to authenticated using (bucket_id = 'videos' and public.es_miembro());
create policy "videos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'videos' and public.es_editor());
create policy "videos_update" on storage.objects for update to authenticated using (bucket_id = 'videos' and public.es_editor()) with check (bucket_id = 'videos' and public.es_editor());
create policy "videos_delete" on storage.objects for delete to authenticated using (bucket_id = 'videos' and public.es_editor());

-- Para revisar quién es quién:
select u.email, m.rol from public.miembros m join auth.users u on u.id = m.user_id order by m.rol, u.email;

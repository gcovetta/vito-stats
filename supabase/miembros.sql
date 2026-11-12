-- Segunda llave de seguridad: solo los usuarios anotados en "miembros" pueden ver y cargar datos.
-- Aunque alguien lograra crearse una cuenta, sin estar en esta lista no ve nada.
-- Correlo DESPUÉS de crear tus usuarios (el tuyo y el de Vito) en Authentication → Users.

create table if not exists public.miembros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado  timestamptz not null default now()
);
alter table public.miembros enable row level security;
-- Nadie lo modifica desde la app; se administra solo desde el dashboard.

create or replace function public.es_miembro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where user_id = auth.uid())
$$;
grant execute on function public.es_miembro() to authenticated;

-- Anota a todos los usuarios que existen hoy (vos y Vito)
insert into public.miembros (user_id) select id from auth.users on conflict do nothing;

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;
create policy "docs_select" on public.docs for select to authenticated using (public.es_miembro());
create policy "docs_insert" on public.docs for insert to authenticated with check (public.es_miembro());
create policy "docs_update" on public.docs for update to authenticated using (public.es_miembro()) with check (public.es_miembro());
create policy "docs_delete" on public.docs for delete to authenticated using (public.es_miembro());

-- Para chequear quiénes quedaron anotados:
select u.email from public.miembros m join auth.users u on u.id = m.user_id;

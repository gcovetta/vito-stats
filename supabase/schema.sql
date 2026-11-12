-- Vito Stats · esquema de Supabase
-- Pegalo entero en Supabase → SQL Editor → New query → Run.
-- Guarda todo en una sola tabla tipo "documentos" (colección + id + datos JSON),
-- igual que la portada original, así la app reusa la misma estructura.

create table if not exists public.docs (
  col        text        not null,               -- torneos, partidos, fisico, clubes, perfil
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid        default auth.uid(),
  primary key (col, id)
);

-- Marca de última modificación
create or replace function public.docs_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs
for each row execute function public.docs_touch();

-- Seguridad: solo usuarios logueados (vos y Vito) pueden leer y escribir.
-- Las altas de usuarios nuevas tienen que estar DESACTIVADAS en Authentication.
alter table public.docs enable row level security;

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;

create policy "docs_select" on public.docs for select to authenticated using (true);
create policy "docs_insert" on public.docs for insert to authenticated with check (true);
create policy "docs_update" on public.docs for update to authenticated using (true) with check (true);
create policy "docs_delete" on public.docs for delete to authenticated using (true);

-- Tiempo real: que la app de Vito se actualice sola cuando cargás un gol.
alter table public.docs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs'
  ) then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- ============================================================
-- Migración: seguir usuarios
-- ============================================================

create table public.seguimientos (
  seguidor_id uuid not null references auth.users(id) on delete cascade,
  seguido_id uuid not null references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (seguidor_id, seguido_id),
  constraint seguimientos_no_auto_seguimiento check (seguidor_id <> seguido_id)
);

create index seguimientos_seguido_id_idx on public.seguimientos (seguido_id);

alter table public.seguimientos enable row level security;

-- Lectura abierta a cualquier autenticado: hace falta para poder calcular
-- contadores y listas de CUALQUIER perfil, no solo el propio. La tabla no
-- contiene datos sensibles (solo dos ids y una fecha).
create policy "Seguimientos - lectura autenticados"
  on public.seguimientos for select
  using (auth.role() = 'authenticated');

create policy "Seguimientos - crear propio"
  on public.seguimientos for insert
  with check (auth.uid() = seguidor_id);

create policy "Seguimientos - borrar propio"
  on public.seguimientos for delete
  using (auth.uid() = seguidor_id);

-- Listas de seguidores/seguidos en una sola llamada segura: unen
-- seguimientos con profiles internamente y solo devuelven campos públicos,
-- nunca email.

create or replace function public.get_seguidores(usuario_id uuid)
returns table (
  id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nombre, p.nombre_usuario, p.foto_url
  from public.seguimientos s
  join public.profiles p on p.id = s.seguidor_id
  where s.seguido_id = usuario_id
  order by s.creado_en desc;
$$;

create or replace function public.get_seguidos(usuario_id uuid)
returns table (
  id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nombre, p.nombre_usuario, p.foto_url
  from public.seguimientos s
  join public.profiles p on p.id = s.seguido_id
  where s.seguidor_id = usuario_id
  order by s.creado_en desc;
$$;

revoke execute on function public.get_seguidores(uuid) from public;
revoke execute on function public.get_seguidos(uuid) from public;
grant execute on function public.get_seguidores(uuid) to authenticated;
grant execute on function public.get_seguidos(uuid) to authenticated;

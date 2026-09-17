-- ============================================================
-- Migración: notificaciones (alguien que sigo vota hoy)
-- ============================================================

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade, -- quien la recibe
  actor_id uuid not null references auth.users(id) on delete cascade,   -- quien generó la actividad
  tipo text not null default 'voto_hoy',
  local_id uuid not null references public.locales(id) on delete cascade,
  evento_id uuid references public.eventos(id) on delete set null,
  creado_en timestamptz not null default now(),
  leida boolean not null default false
);

create index notificaciones_usuario_creado_idx on public.notificaciones (usuario_id, creado_en desc);
create index notificaciones_no_leidas_idx on public.notificaciones (usuario_id) where not leida;

alter table public.notificaciones enable row level security;

create policy "Notificaciones - leer propias"
  on public.notificaciones for select
  using (auth.uid() = usuario_id);

create policy "Notificaciones - marcar propias como leídas"
  on public.notificaciones for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Privilegios a nivel de tabla (además de RLS, que controla las filas):
-- el frontend lee notificaciones y actualiza "leida" directamente, sin pasar
-- por una función. Empezamos revocando todo lo que Supabase concede por
-- defecto a las tablas nuevas, y concedemos solo lo estrictamente necesario:
-- lectura completa y actualización limitada a la columna "leida". Nunca
-- INSERT ni DELETE, ni UPDATE general sobre el resto de columnas.
revoke all on table public.notificaciones from authenticated;
grant select on table public.notificaciones to authenticated;
grant update (leida) on table public.notificaciones to authenticated;

-- ============================================================
-- Trigger: genera notificaciones para los seguidores de quien vota
-- Solo para votos de HOY (new.fecha = current_date), tanto al insertar
-- el primer voto del día como al cambiarlo.
-- ============================================================

create or replace function public.notificar_voto_seguidores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.fecha = current_date then
    insert into public.notificaciones (usuario_id, actor_id, tipo, local_id, evento_id)
    select s.seguidor_id, new.usuario_id, 'voto_hoy', new.local_id, new.evento_id
    from public.seguimientos s
    where s.seguido_id = new.usuario_id;

  elsif tg_op = 'UPDATE' and new.fecha = current_date then
    if new.local_id is distinct from old.local_id
       or new.evento_id is distinct from old.evento_id then
      insert into public.notificaciones (usuario_id, actor_id, tipo, local_id, evento_id)
      select s.seguidor_id, new.usuario_id, 'voto_hoy', new.local_id, new.evento_id
      from public.seguimientos s
      where s.seguido_id = new.usuario_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger votos_notificar_seguidores
  after insert or update on public.votos
  for each row execute function public.notificar_voto_seguidores();

-- El trigger sigue disparándose igual (lo invoca el motor internamente);
-- esto solo impide que cualquier rol la llame directamente como función.
revoke execute on function public.notificar_voto_seguidores() from public;
revoke execute on function public.notificar_voto_seguidores() from authenticated;

-- ============================================================
-- Lectura de notificaciones en una sola llamada (con datos públicos)
-- ============================================================

create or replace function public.get_notificaciones()
returns table (
  id uuid,
  actor_id uuid,
  actor_nombre text,
  actor_nombre_usuario text,
  actor_foto_url text,
  local_id uuid,
  local_nombre text,
  evento_id uuid,
  evento_nombre text,
  creado_en timestamptz,
  leida boolean
)
language sql
security definer
set search_path = public
as $$
  select
    n.id,
    p.id as actor_id,
    p.nombre as actor_nombre,
    p.nombre_usuario as actor_nombre_usuario,
    p.foto_url as actor_foto_url,
    l.id as local_id,
    l.nombre as local_nombre,
    e.id as evento_id,
    e.nombre as evento_nombre,
    n.creado_en,
    n.leida
  from public.notificaciones n
  join public.profiles p on p.id = n.actor_id
  join public.locales l on l.id = n.local_id
  left join public.eventos e on e.id = n.evento_id
  where n.usuario_id = auth.uid()
  order by n.creado_en desc
  limit 50;
$$;

-- Sin parámetro de usuario: solo puede devolver las notificaciones de quien
-- la llama, nunca las de otra persona.
revoke execute on function public.get_notificaciones() from public;
grant execute on function public.get_notificaciones() to authenticated;

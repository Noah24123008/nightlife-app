-- ============================================================
-- Migración: notificaciones por nuevo seguidor
-- ============================================================

-- Los votos siempre tienen local_id, pero un "nuevo seguidor" no está
-- asociado a ningún local ni evento, así que dejamos de exigirlo.
alter table public.notificaciones alter column local_id drop not null;

-- ============================================================
-- Trigger: notifica al usuario seguido cuando alguien empieza a seguirle.
-- Solo AFTER INSERT: dejar de seguir es un DELETE y no dispara nada;
-- volver a seguir es un INSERT nuevo y sí genera notificación de nuevo.
-- ============================================================

create or replace function public.notificar_nuevo_seguidor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificaciones (usuario_id, actor_id, tipo, local_id, evento_id)
  values (new.seguido_id, new.seguidor_id, 'nuevo_seguidor', null, null);
  return new;
end;
$$;

create trigger seguimientos_notificar_nuevo_seguidor
  after insert on public.seguimientos
  for each row execute function public.notificar_nuevo_seguidor();

-- El trigger se sigue disparando igual (lo invoca el motor internamente);
-- esto solo impide que cualquier rol la llame directamente como función.
revoke execute on function public.notificar_nuevo_seguidor() from public;
revoke execute on function public.notificar_nuevo_seguidor() from authenticated;

-- ============================================================
-- get_notificaciones(): añade "tipo" y pasa locales a LEFT JOIN, porque
-- ahora una notificación puede no tener local (nuevo_seguidor).
-- Cambia la lista de columnas devueltas, así que hay que recrearla.
-- ============================================================

drop function if exists public.get_notificaciones();

create function public.get_notificaciones()
returns table (
  id uuid,
  tipo text,
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
    n.tipo,
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
  left join public.locales l on l.id = n.local_id
  left join public.eventos e on e.id = n.evento_id
  where n.usuario_id = auth.uid()
  order by n.creado_en desc
  limit 50;
$$;

-- Sin parámetro de usuario: solo puede devolver las notificaciones de quien
-- la llama, nunca las de otra persona.
revoke execute on function public.get_notificaciones() from public;
grant execute on function public.get_notificaciones() to authenticated;

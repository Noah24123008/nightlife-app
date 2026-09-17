-- ============================================================
-- Migración: notificaciones de solicitudes de amistad.
-- No toca "seguimientos". No crea notificación de rechazo.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Columna de enlace hacia la solicitud correspondiente
-- ------------------------------------------------------------

alter table public.notificaciones
  add column solicitud_amistad_id uuid references public.solicitudes_amistad(id) on delete cascade;

-- ------------------------------------------------------------
-- 2) get_notificaciones(): añade solicitud_amistad_id a su salida.
-- Cambia la lista de columnas devueltas, así que hay que recrearla.
-- ------------------------------------------------------------

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
  solicitud_amistad_id uuid,
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
    n.solicitud_amistad_id,
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

revoke execute on function public.get_notificaciones() from public;
grant execute on function public.get_notificaciones() to authenticated;

-- ------------------------------------------------------------
-- 3) Trigger: nueva solicitud pendiente (alta nueva o reenvío tras
-- rechazo). Borra cualquier notificación de solicitud anterior para
-- esa misma fila antes de crear la nueva, para que nunca haya dos
-- tarjetas de la misma relación.
-- ------------------------------------------------------------

create or replace function public.notificar_solicitud_amistad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'pendiente' then
      delete from public.notificaciones
      where tipo = 'solicitud_amistad' and solicitud_amistad_id = new.id;

      insert into public.notificaciones (usuario_id, actor_id, tipo, solicitud_amistad_id)
      values (new.usuario_receptor_id, new.usuario_solicitante_id, 'solicitud_amistad', new.id);
    end if;

  elsif tg_op = 'UPDATE' then
    if new.estado = 'pendiente' and old.estado is distinct from 'pendiente' then
      delete from public.notificaciones
      where tipo = 'solicitud_amistad' and solicitud_amistad_id = new.id;

      insert into public.notificaciones (usuario_id, actor_id, tipo, solicitud_amistad_id)
      values (new.usuario_receptor_id, new.usuario_solicitante_id, 'solicitud_amistad', new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger solicitudes_notificar_pendiente
  after insert or update on public.solicitudes_amistad
  for each row execute function public.notificar_solicitud_amistad();

-- Sin grant a authenticated: nadie la llama directamente, el motor la
-- dispara igual desde el propio trigger.
revoke execute on function public.notificar_solicitud_amistad() from public;
revoke execute on function public.notificar_solicitud_amistad() from authenticated;

-- ------------------------------------------------------------
-- 4) Trigger: respuesta a una solicitud (aceptar o rechazar). Siempre
-- retira la notificación accionable del receptor; solo si fue
-- aceptada, crea el aviso para quien la envió. Sin notificación de
-- rechazo.
-- ------------------------------------------------------------

create or replace function public.notificar_respuesta_solicitud_amistad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estado = 'pendiente' and new.estado in ('aceptada', 'rechazada') then
    delete from public.notificaciones
    where tipo = 'solicitud_amistad' and solicitud_amistad_id = new.id;

    if new.estado = 'aceptada' then
      insert into public.notificaciones (usuario_id, actor_id, tipo, solicitud_amistad_id)
      values (new.usuario_solicitante_id, new.usuario_receptor_id, 'amistad_aceptada', new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger solicitudes_notificar_respuesta
  after update on public.solicitudes_amistad
  for each row execute function public.notificar_respuesta_solicitud_amistad();

revoke execute on function public.notificar_respuesta_solicitud_amistad() from public;
revoke execute on function public.notificar_respuesta_solicitud_amistad() from authenticated;

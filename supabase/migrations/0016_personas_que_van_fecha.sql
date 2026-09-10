-- ============================================================
-- Migración: get_personas_que_van_hoy pasa a aceptar p_fecha.
-- Cambiar de (uuid, uuid) a (uuid, uuid, date) cambia la firma de
-- entrada, así que "create or replace" por sí solo dejaría dos
-- funciones distintas en vez de sustituir la anterior. Por eso se
-- borra explícitamente la versión de 2 parámetros antes de crear
-- la de 3. El "if exists" hace la migración segura de volver a
-- ejecutar por error sin que falle.
-- ============================================================

drop function if exists public.get_personas_que_van_hoy(uuid, uuid);

create or replace function public.get_personas_que_van_hoy(
  p_local_id uuid default null,
  p_evento_id uuid default null,
  p_fecha date default current_date
)
returns table (
  id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text,
  es_seguido boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.nombre_usuario,
    p.foto_url,
    exists (
      select 1 from public.seguimientos s
      where s.seguidor_id = auth.uid() and s.seguido_id = v.usuario_id
    ) as es_seguido
  from public.votos v
  join public.profiles p on p.id = v.usuario_id
  where v.fecha = p_fecha
    and (
      (p_evento_id is not null and v.evento_id = p_evento_id)
      or (p_evento_id is null and p_local_id is not null and v.local_id = p_local_id)
    )
  order by es_seguido desc, coalesce(p.nombre_usuario, p.nombre, '') asc
  limit 50;
$$;

-- Solo autenticados; nunca devuelve email ni ningún otro dato de perfil.
revoke execute on function public.get_personas_que_van_hoy(uuid, uuid, date) from public;
grant execute on function public.get_personas_que_van_hoy(uuid, uuid, date) to authenticated;

-- ============================================================
-- Migración: personas que van hoy (local o evento), con prioridad
-- para las personas que sigue el usuario autenticado
-- ============================================================

create or replace function public.get_personas_que_van_hoy(
  p_local_id uuid default null,
  p_evento_id uuid default null
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
  where v.fecha = current_date
    and (
      (p_evento_id is not null and v.evento_id = p_evento_id)
      or (p_evento_id is null and p_local_id is not null and v.local_id = p_local_id)
    )
  order by es_seguido desc, coalesce(p.nombre_usuario, p.nombre, '') asc
  limit 50;
$$;

-- Solo autenticados; nunca devuelve email ni ningún otro dato de perfil.
revoke execute on function public.get_personas_que_van_hoy(uuid, uuid) from public;
grant execute on function public.get_personas_que_van_hoy(uuid, uuid) to authenticated;

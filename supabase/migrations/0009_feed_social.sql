-- ============================================================
-- Migración: feed social de hoy (gente que sigo)
-- ============================================================

create or replace function public.get_feed_social_hoy()
returns table (
  usuario_id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text,
  local_id uuid,
  local_nombre text,
  evento_id uuid,
  evento_nombre text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as usuario_id,
    p.nombre,
    p.nombre_usuario,
    p.foto_url,
    l.id as local_id,
    l.nombre as local_nombre,
    e.id as evento_id,
    e.nombre as evento_nombre
  from public.seguimientos s
  join public.votos v on v.usuario_id = s.seguido_id
  join public.profiles p on p.id = v.usuario_id
  join public.locales l on l.id = v.local_id
  left join public.eventos e on e.id = v.evento_id
  where s.seguidor_id = auth.uid()
    and v.fecha = current_date
  order by v.actualizado_en desc
  limit 20;
$$;

-- Sin parámetro de usuario: solo puede devolver el feed de quien la llama,
-- nunca actividad arbitraria de otra persona.
revoke execute on function public.get_feed_social_hoy() from public;
grant execute on function public.get_feed_social_hoy() to authenticated;

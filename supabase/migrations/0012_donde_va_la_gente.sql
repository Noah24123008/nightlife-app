-- ============================================================
-- Migración: dónde va la gente hoy (ranking agregado por local)
-- ============================================================

create or replace function public.get_donde_va_la_gente_hoy()
returns table (
  local_id uuid,
  local_nombre text,
  total_personas bigint,
  muestra_perfiles jsonb
)
language sql
security definer
set search_path = public
as $$
  with votos_hoy as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    where v.fecha = current_date
      and l.activo = true
  ),
  totales as (
    select local_id, count(*) as total_personas
    from votos_hoy
    group by local_id
  ),
  votos_rankeados as (
    select
      local_id,
      usuario_id,
      row_number() over (partition by local_id order by actualizado_en desc) as posicion
    from votos_hoy
  ),
  muestras as (
    select
      vr.local_id,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nombre', p.nombre,
          'nombre_usuario', p.nombre_usuario,
          'foto_url', p.foto_url
        )
        order by vr.posicion
      ) as perfiles
    from votos_rankeados vr
    join public.profiles p on p.id = vr.usuario_id
    where vr.posicion <= 3
    group by vr.local_id
  )
  select
    l.id as local_id,
    l.nombre as local_nombre,
    t.total_personas,
    coalesce(m.perfiles, '[]'::jsonb) as muestra_perfiles
  from totales t
  join public.locales l on l.id = t.local_id
  left join muestras m on m.local_id = t.local_id
  order by t.total_personas desc, l.nombre asc
  limit 30;
$$;

-- Sin parámetro: solo usuarios autenticados, y nunca devuelve email ni
-- ningún otro dato de perfil distinto de id/nombre/nombre_usuario/foto_url.
revoke execute on function public.get_donde_va_la_gente_hoy() from public;
grant execute on function public.get_donde_va_la_gente_hoy() to authenticated;

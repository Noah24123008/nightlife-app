-- ============================================================
-- Migración: Inicio funciona por fecha seleccionada.
-- get_donde_va_la_gente_hoy, get_recomendaciones_sociales_hoy y
-- get_feed_social_hoy pasan de () a (date). Al cambiar la firma,
-- "create or replace" dejaría dos funciones distintas en vez de
-- sustituir la anterior, así que cada una se borra explícitamente
-- antes de recrearla (igual que en la migración 0016).
-- ============================================================

-- ------------------------------------------------------------
-- 1) get_donde_va_la_gente_hoy
-- ------------------------------------------------------------

drop function if exists public.get_donde_va_la_gente_hoy();

create or replace function public.get_donde_va_la_gente_hoy(
  p_fecha date default current_date
)
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
  with votos_dia as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    where v.fecha = p_fecha
      and l.activo = true
  ),
  totales as (
    select local_id, count(*) as total_personas
    from votos_dia
    group by local_id
  ),
  votos_rankeados as (
    select
      local_id,
      usuario_id,
      row_number() over (partition by local_id order by actualizado_en desc) as posicion
    from votos_dia
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

revoke execute on function public.get_donde_va_la_gente_hoy(date) from public;
grant execute on function public.get_donde_va_la_gente_hoy(date) to authenticated;

-- ------------------------------------------------------------
-- 2) get_recomendaciones_sociales_hoy
-- ------------------------------------------------------------

drop function if exists public.get_recomendaciones_sociales_hoy();

create or replace function public.get_recomendaciones_sociales_hoy(
  p_fecha date default current_date
)
returns table (
  local_id uuid,
  local_nombre text,
  seguidos_que_van bigint,
  total_personas bigint,
  muestra_seguidos jsonb
)
language sql
security definer
set search_path = public
as $$
  with mi_voto_dia as (
    select local_id
    from public.votos
    where usuario_id = auth.uid() and fecha = p_fecha
  ),
  votos_dia as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    where v.fecha = p_fecha
      and l.activo = true
      and v.local_id not in (select local_id from mi_voto_dia)
  ),
  votos_seguidos as (
    select vd.local_id, vd.usuario_id, vd.actualizado_en
    from votos_dia vd
    join public.seguimientos s
      on s.seguido_id = vd.usuario_id and s.seguidor_id = auth.uid()
  ),
  totales as (
    select local_id, count(*) as total_personas
    from votos_dia
    group by local_id
  ),
  totales_seguidos as (
    select local_id, count(*) as seguidos_que_van
    from votos_seguidos
    group by local_id
  ),
  votos_seguidos_rankeados as (
    select
      local_id,
      usuario_id,
      row_number() over (partition by local_id order by actualizado_en desc) as posicion
    from votos_seguidos
  ),
  muestras as (
    select
      vsr.local_id,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nombre', p.nombre,
          'nombre_usuario', p.nombre_usuario,
          'foto_url', p.foto_url
        )
        order by vsr.posicion
      ) as perfiles
    from votos_seguidos_rankeados vsr
    join public.profiles p on p.id = vsr.usuario_id
    where vsr.posicion <= 3
    group by vsr.local_id
  )
  select
    l.id as local_id,
    l.nombre as local_nombre,
    ts.seguidos_que_van,
    t.total_personas,
    coalesce(m.perfiles, '[]'::jsonb) as muestra_seguidos
  from totales_seguidos ts
  join totales t on t.local_id = ts.local_id
  join public.locales l on l.id = ts.local_id
  left join muestras m on m.local_id = ts.local_id
  order by ts.seguidos_que_van desc, t.total_personas desc, l.nombre asc
  limit 5;
$$;

revoke execute on function public.get_recomendaciones_sociales_hoy(date) from public;
grant execute on function public.get_recomendaciones_sociales_hoy(date) to authenticated;

-- ------------------------------------------------------------
-- 3) get_feed_social_hoy
-- ------------------------------------------------------------

drop function if exists public.get_feed_social_hoy();

create or replace function public.get_feed_social_hoy(
  p_fecha date default current_date
)
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
    and v.fecha = p_fecha
  order by v.actualizado_en desc
  limit 20;
$$;

revoke execute on function public.get_feed_social_hoy(date) from public;
grant execute on function public.get_feed_social_hoy(date) to authenticated;

-- ============================================================
-- Comprobación: debe devolver exactamente 1 fila por función
-- (confirma que no ha quedado ningún overload duplicado).
-- ============================================================

select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_donde_va_la_gente_hoy',
    'get_recomendaciones_sociales_hoy',
    'get_feed_social_hoy'
  );

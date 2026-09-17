-- ============================================================
-- Migración: fecha efectiva explícita en Europe/Madrid.
--
-- En una función "language sql", el valor por defecto de un
-- parámetro (p_fecha date default current_date) se resuelve como
-- parte de la preparación de la llamada, no dentro del cuerpo de
-- la función — así que puede evaluarse ANTES de que un "set
-- timezone" local a la función entre en vigor. Para no depender de
-- ese orden, p_fecha pasa a valer NULL por defecto, y cada función
-- calcula explícitamente su "fecha efectiva" en el propio cuerpo:
--
--   coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date)
--
-- "at time zone" convierte explícitamente el instante actual a la
-- hora de Madrid, sin depender de ninguna configuración de sesión
-- ni de función, así que no hay ambigüedad de ningún tipo.
--
-- Ni el tipo ni el número de parámetros cambian respecto a las
-- migraciones 0016/0017 (solo el valor por defecto), así que esto
-- es un "create or replace" normal: no hace falta "drop function"
-- y no se crea ningún overload.
-- ============================================================

create or replace function public.get_donde_va_la_gente_hoy(
  p_fecha date default null
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
  with fecha_efectiva as (
    select coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date) as valor
  ),
  votos_dia as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    cross join fecha_efectiva fe
    where v.fecha = fe.valor
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

create or replace function public.get_personas_que_van_hoy(
  p_local_id uuid default null,
  p_evento_id uuid default null,
  p_fecha date default null
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
  with fecha_efectiva as (
    select coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date) as valor
  )
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
  cross join fecha_efectiva fe
  join public.profiles p on p.id = v.usuario_id
  where v.fecha = fe.valor
    and (
      (p_evento_id is not null and v.evento_id = p_evento_id)
      or (p_evento_id is null and p_local_id is not null and v.local_id = p_local_id)
    )
  order by es_seguido desc, coalesce(p.nombre_usuario, p.nombre, '') asc
  limit 50;
$$;

revoke execute on function public.get_personas_que_van_hoy(uuid, uuid, date) from public;
grant execute on function public.get_personas_que_van_hoy(uuid, uuid, date) to authenticated;

create or replace function public.get_recomendaciones_sociales_hoy(
  p_fecha date default null
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
  with fecha_efectiva as (
    select coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date) as valor
  ),
  mi_voto_dia as (
    select v.local_id
    from public.votos v
    cross join fecha_efectiva fe
    where v.usuario_id = auth.uid() and v.fecha = fe.valor
  ),
  votos_dia as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    cross join fecha_efectiva fe
    where v.fecha = fe.valor
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

create or replace function public.get_feed_social_hoy(
  p_fecha date default null
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
  with fecha_efectiva as (
    select coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date) as valor
  )
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
  cross join fecha_efectiva fe
  join public.profiles p on p.id = v.usuario_id
  join public.locales l on l.id = v.local_id
  left join public.eventos e on e.id = v.evento_id
  where s.seguidor_id = auth.uid()
    and v.fecha = fe.valor
  order by v.actualizado_en desc
  limit 20;
$$;

revoke execute on function public.get_feed_social_hoy(date) from public;
grant execute on function public.get_feed_social_hoy(date) to authenticated;

-- Comprobación: la fecha real de Madrid en este momento, calculada
-- exactamente igual que dentro de las funciones (sin depender de
-- ninguna configuración de sesión).
select (now() at time zone 'Europe/Madrid')::date as fecha_real_en_madrid;

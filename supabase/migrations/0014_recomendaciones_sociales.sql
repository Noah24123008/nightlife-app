-- ============================================================
-- Migración: recomendaciones sociales simples ("Te puede interesar hoy")
-- ============================================================

create or replace function public.get_recomendaciones_sociales_hoy()
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
  with mi_voto_hoy as (
    select local_id
    from public.votos
    where usuario_id = auth.uid() and fecha = current_date
  ),
  votos_hoy as (
    select v.local_id, v.usuario_id, v.actualizado_en
    from public.votos v
    join public.locales l on l.id = v.local_id
    where v.fecha = current_date
      and l.activo = true
      and v.local_id not in (select local_id from mi_voto_hoy)
  ),
  votos_seguidos as (
    select vh.local_id, vh.usuario_id, vh.actualizado_en
    from votos_hoy vh
    join public.seguimientos s
      on s.seguido_id = vh.usuario_id and s.seguidor_id = auth.uid()
  ),
  totales as (
    select local_id, count(*) as total_personas
    from votos_hoy
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

-- Sin parámetro de usuario: solo puede devolver las recomendaciones de quien
-- la llama, nunca las de otra persona.
revoke execute on function public.get_recomendaciones_sociales_hoy() from public;
grant execute on function public.get_recomendaciones_sociales_hoy() to authenticated;

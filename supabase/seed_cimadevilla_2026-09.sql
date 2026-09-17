-- ============================================================
-- Datos: Fiestas de Cimadevilla (destino temporal, fin de semana
-- 11-12 de septiembre de 2026). NO es una migración de estructura:
-- no añade columnas ni tablas, solo filas en locales/eventos ya
-- existentes. Seguro de ejecutar más de una vez (idempotente).
-- ============================================================

-- 1) Local temporal
-- Solo inserta si no existe ya un local con este nombre en Gijón.
insert into public.locales (ciudad_id, nombre, categoria, direccion, descripcion, activo)
select
  (select id from public.ciudades where nombre = 'Gijón'),
  'Fiestas de Cimadevilla',
  'Carpa de fiestas',
  'Auditorio del Cerro, Cimavilla, Gijón',
  'Carpa de las Fiestas de Cimadevilla, con sesiones de DJ durante el fin de semana. Ubicada en el Auditorio del Cerro / Cerro de Santa Catalina, Cimavilla.',
  true
where not exists (
  select 1 from public.locales
  where nombre = 'Fiestas de Cimadevilla'
    and ciudad_id = (select id from public.ciudades where nombre = 'Gijón')
);

-- 2) Evento del viernes
-- Solo inserta si ese local no tiene ya un evento en esa fecha.
insert into public.eventos (local_id, nombre, fecha, hora_inicio)
select
  l.id,
  'Eleven + DJ — Fiestas de Cimadevilla',
  date '2026-09-11',
  time '23:15'
from public.locales l
where l.nombre = 'Fiestas de Cimadevilla'
  and not exists (
    select 1 from public.eventos e
    where e.local_id = l.id and e.fecha = date '2026-09-11'
  );

-- 3) Evento del sábado
insert into public.eventos (local_id, nombre, fecha, hora_inicio)
select
  l.id,
  'La Movida + DJ — Fiestas de Cimadevilla',
  date '2026-09-12',
  time '23:15'
from public.locales l
where l.nombre = 'Fiestas de Cimadevilla'
  and not exists (
    select 1 from public.eventos e
    where e.local_id = l.id and e.fecha = date '2026-09-12'
  );

-- ============================================================
-- Comprobación: ejecutar después de lo anterior para verificar
-- que el local y sus dos eventos quedaron creados correctamente.
-- ============================================================

select
  l.id as local_id,
  l.nombre as local_nombre,
  l.categoria,
  l.direccion,
  l.activo,
  e.id as evento_id,
  e.nombre as evento_nombre,
  e.fecha,
  e.hora_inicio
from public.locales l
left join public.eventos e on e.local_id = l.id
where l.nombre = 'Fiestas de Cimadevilla'
order by e.fecha;

-- ============================================================
-- NO EJECUTAR TODAVÍA. Desactivación posterior al fin de semana:
-- desactiva el local (deja de aparecer como destino activo en
-- ranking, mapa, recomendaciones y "Dónde va la gente hoy"), pero
-- no borra nada: ni el local, ni sus eventos, ni los votos que
-- haya recibido, quedan intactos como histórico.
-- ============================================================

-- update public.locales
-- set activo = false
-- where nombre = 'Fiestas de Cimadevilla';

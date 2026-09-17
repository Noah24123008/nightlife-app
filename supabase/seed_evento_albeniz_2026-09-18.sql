-- ============================================================
-- Datos: evento real "Morreo: Vuelta a clases" en Albéniz
-- (18 de septiembre de 2026). No es una migración de estructura:
-- no añade columnas ni tablas, solo una fila en eventos.
-- ============================================================

-- 0) Comprobación previa (ejecutar antes del insert): confirma que
-- Albéniz existe tal cual, con ese nombre exacto, antes de continuar.
select id, nombre, activo
from public.locales
where nombre = 'Albéniz';

-- 1) Insertar el evento, idempotente: si ya existe un evento con este
-- nombre, esta fecha y este local, no vuelve a insertarlo. Si Albéniz
-- no existe con ese nombre exacto, no inserta nada (sin error).
insert into public.eventos (local_id, nombre, fecha, descripcion)
select
  l.id,
  'Morreo: Vuelta a clases',
  date '2026-09-18',
  'Entrada de pago. Tramo actual: 10 € con 1 consumición. Después: 12 € con 1 consumición. Consumición válida hasta la 1:30.'
from public.locales l
where l.nombre = 'Albéniz'
  and not exists (
    select 1 from public.eventos e
    where e.local_id = l.id
      and e.nombre = 'Morreo: Vuelta a clases'
      and e.fecha = date '2026-09-18'
  );

-- ============================================================
-- Comprobación posterior: ejecutar después del insert para
-- verificar que el evento quedó bien creado y asociado a Albéniz.
-- ============================================================

select
  e.id as evento_id,
  e.nombre,
  e.fecha,
  e.hora_inicio,
  e.hora_fin,
  e.descripcion,
  l.nombre as local_nombre
from public.eventos e
join public.locales l on l.id = e.local_id
where e.nombre = 'Morreo: Vuelta a clases'
  and e.fecha = date '2026-09-18';

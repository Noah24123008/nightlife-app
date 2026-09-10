-- ============================================================
-- Datos de desarrollo (NO son información real verificada de estos
-- negocios: horarios, descripciones y eventos son inventados para
-- probar la app. Los nombres y zonas están inspirados en la vida
-- nocturna real de Gijón -Cimavilla, Puerto Deportivo, Fomento-
-- únicamente para que el MVP se sienta realista durante el desarrollo.)
-- ============================================================

insert into public.ciudades (nombre, activa) values ('Gijón', true);

insert into public.locales (ciudad_id, nombre, descripcion, direccion, categoria, horario, foto_url)
select
  (select id from public.ciudades where nombre = 'Gijón'),
  v.nombre, v.descripcion, v.direccion, v.categoria, v.horario, v.foto_url
from (values
  ('The Balance', 'Cócteles originales y ambiente cuidado junto al puerto.', 'Puerto Deportivo, Gijón', 'Bar de copas', '18:00 - 03:00', null),
  ('El Cantora', 'Copas frente al mar en pleno Paseo del Muro.', 'Paseo del Muro, Gijón', 'Bar de copas', '17:00 - 03:00', null),
  ('Boulevar', 'Uno de los locales de referencia de la noche gijonesa.', 'Cimavilla, Gijón', 'Discoteca', '23:00 - 05:30', null),
  ('Pub Varsovia', 'Dos ambientes: chill arriba, más animado abajo, frente a San Lorenzo.', 'Paseo San Lorenzo, Gijón', 'Pub', '20:00 - 04:00', null),
  ('Pub Audrey Náutico', 'Pub clásico de la zona del puerto deportivo.', 'Puerto Deportivo, Gijón', 'Pub', '19:00 - 03:30', null),
  ('Karaoke El Vinilo', 'Karaoke y ambiente desenfadado en Fomento.', 'Zona de Fomento, Gijón', 'Karaoke', '21:00 - 04:00', null),
  ('Pub Cabaré', 'Pub de referencia en la zona de Fomento.', 'Zona de Fomento, Gijón', 'Pub', '20:00 - 04:00', null),
  ('La Plaza', 'Ambiente clásico en la Plaza de la Corrada, corazón de Cimavilla.', 'Plaza de la Corrada, Gijón', 'Bar de copas', '17:00 - 02:30', null),
  ('Sidrería Casa Fede', 'Sidrería con vistas al puerto deportivo.', 'Tránsito de las Ballenas 4, Gijón', 'Sidrería', '12:00 - 00:00', null),
  ('Tar d''Abéu', 'Sidrería tradicional en pleno barrio alto.', 'María Bandujo 1, Gijón', 'Sidrería', '12:00 - 00:00', null)
) as v(nombre, descripcion, direccion, categoria, horario, foto_url);

-- Eventos repartidos entre hoy y los próximos días (fechas relativas a
-- cuando se ejecute este script, para que la agenda siempre esté "viva")
insert into public.eventos (local_id, nombre, descripcion, fecha, hora_inicio, hora_fin)
select
  (select id from public.locales where nombre = e.local_nombre),
  e.nombre, e.descripcion, e.fecha, e.hora_inicio, e.hora_fin
from (values
  ('Boulevar', 'Sesión house de la semana', 'DJ set house hasta el amanecer.', current_date, time '23:30', time '05:00'),
  ('Karaoke El Vinilo', 'Noche de karaoke especial', 'Concursos y premios para los mejores momentos.', current_date, time '22:00', null),
  ('The Balance', 'Sesión vermú con DJ', 'Vermú, cócteles y sesión suave en directo.', current_date + 1, time '19:00', time '22:00'),
  ('Pub Varsovia', 'Fiesta de apertura de curso', 'Precios especiales toda la noche.', current_date + 1, time '23:00', null),
  ('Pub Cabaré', 'Concierto acústico', 'Actuación en directo antes de la sesión de noche.', current_date + 2, time '21:00', time '23:00'),
  ('La Plaza', 'Noche de reggaetón', 'Sesión temática en pleno Cimavilla.', current_date + 3, time '23:00', null)
) as e(local_nombre, nombre, descripcion, fecha, hora_inicio, hora_fin);

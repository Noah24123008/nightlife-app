-- ============================================================
-- Migración: corrige el 403 (42501, "permission denied for table
-- feedback_beta") al insertar feedback desde el frontend.
--
-- CAUSA: 0029_feedback_beta.sql creó la tabla, activó RLS y añadió la
-- policy de INSERT ("Feedback - crear propio", auth.uid() =
-- usuario_id) — pero nunca concedió el privilegio SQL BASE de INSERT
-- al rol "authenticated" sobre la tabla en sí. RLS es un FILTRO sobre
-- operaciones ya permitidas a nivel de privilegio de tabla, no un
-- sustituto de ese privilegio: sin el GRANT, Postgres rechaza la
-- petición en la capa de permisos, antes de que la policy de RLS
-- llegue a evaluarse. Las tablas creadas en 0001_init.sql (como
-- "votos") ya tenían este privilegio base por la configuración de
-- permisos por defecto del proyecto en el momento en que se crearon;
-- una tabla nueva creada después no lo hereda automáticamente.
--
-- No se toca 0029: la tabla, sus CHECK, sus índices y la policy de
-- INSERT siguen exactamente igual. Esta migración solo añade el
-- privilegio de tabla que faltaba.
--
-- Mínimo privilegio, explícito: se revoca todo de "anon" y de
-- "authenticated" primero (para no depender de ningún privilegio
-- residual implícito) y se concede ÚNICAMENTE insert a
-- "authenticated". Ni SELECT, ni UPDATE, ni DELETE, para ningún rol
-- de cliente. La lectura y el cambio de estado siguen pasando
-- exclusivamente por admin_listar_feedback()/
-- admin_cambiar_estado_feedback() (SECURITY DEFINER, sin cambios).
--
-- id es uuid con default gen_random_uuid() — una función, no una
-- secuencia. No existe ninguna sequence asociada a esta tabla, así
-- que no hace falta ningún permiso sobre sequences.
-- ============================================================

revoke all on table public.feedback_beta from anon;
revoke all on table public.feedback_beta from authenticated;

grant insert on table public.feedback_beta to authenticated;

-- RLS sigue activa (ya lo estaba desde 0029) y sigue siendo quien
-- decide, dentro de ese INSERT ya permitido a nivel de tabla, si la
-- fila concreta es aceptada: solo cuando auth.uid() = usuario_id.

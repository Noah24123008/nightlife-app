-- ============================================================
-- Migración: limpieza SQL del sistema antiguo de "seguir" (Paso 3)
--
-- Retira únicamente lo que ya no tiene ningún llamador, confirmado por
-- auditoría del código real:
--   - trigger seguimientos_notificar_nuevo_seguidor (sobre seguimientos)
--   - función public.notificar_nuevo_seguidor()
--   - función public.get_seguidores(uuid)
--   - función public.get_seguidos(uuid)
--
-- NO se toca:
--   - la tabla public.seguimientos (se conserva íntegra, con sus datos)
--   - las notificaciones ya guardadas de tipo 'nuevo_seguidor'
--   - NotificacionCard.jsx ni ningún otro archivo de frontend
-- ============================================================

-- El trigger se retira antes que la función que ejecuta: una función no
-- se puede eliminar mientras un trigger siga dependiendo de ella.
drop trigger if exists seguimientos_notificar_nuevo_seguidor on public.seguimientos;

drop function if exists public.notificar_nuevo_seguidor();

drop function if exists public.get_seguidores(uuid);

drop function if exists public.get_seguidos(uuid);

-- Comprobación (solo lectura): confirma que los objetos se han retirado
-- y que "seguimientos" sigue intacta, con sus filas de siempre.
select
  (select count(*) from pg_proc where proname = 'notificar_nuevo_seguidor') as funcion_notificar_restante,
  (select count(*) from pg_proc where proname in ('get_seguidores', 'get_seguidos')) as rpc_restantes,
  (select count(*) from public.seguimientos) as filas_seguimientos_intactas;

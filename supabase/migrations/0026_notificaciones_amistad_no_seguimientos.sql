-- ============================================================
-- Migración: notificar_voto_seguidores() deja de usar "seguimientos"
-- (seguimiento unidireccional, sin aprobación) y pasa a notificar
-- únicamente a amigos aceptados según solicitudes_amistad.
--
-- CAUSA CORREGIDA: esta función (creada en 0010_notificaciones.sql)
-- nunca se actualizó cuando el resto del sistema social migró a
-- amistad mutua en 0019-0021. Seguía leyendo "seguimientos" —una
-- tabla que el frontend ya no escribe, congelada con datos
-- históricos de antes del sistema de amistad— por lo que generaba
-- notificaciones "X va hoy" entre cuentas que nunca llegaron a
-- hacerse amigas en el sistema actual.
--
-- Mismo nombre y firma que la versión original (returns trigger, sin
-- parámetros), así que el trigger votos_notificar_seguidores (creado
-- en 0010, nunca tocado desde entonces) sigue apuntando a ella sin
-- necesidad de recrearlo.
--
-- Sin cambios en: tipo de notificación, columnas insertadas, relación
-- con votos, condición de fecha (new.fecha = current_date, igual que
-- siempre) ni la condición de cambio de local/evento en UPDATE. Único
-- cambio real: de dónde sale la lista de destinatarios.
-- ============================================================

create or replace function public.notificar_voto_seguidores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.fecha = current_date then
    insert into public.notificaciones (usuario_id, actor_id, tipo, local_id, evento_id)
    select
      case
        when sa.usuario_solicitante_id = new.usuario_id then sa.usuario_receptor_id
        else sa.usuario_solicitante_id
      end,
      new.usuario_id,
      'voto_hoy',
      new.local_id,
      new.evento_id
    from public.solicitudes_amistad sa
    where sa.estado = 'aceptada'
      and (sa.usuario_solicitante_id = new.usuario_id or sa.usuario_receptor_id = new.usuario_id);

  elsif tg_op = 'UPDATE' and new.fecha = current_date then
    if new.local_id is distinct from old.local_id
       or new.evento_id is distinct from old.evento_id then
      insert into public.notificaciones (usuario_id, actor_id, tipo, local_id, evento_id)
      select
        case
          when sa.usuario_solicitante_id = new.usuario_id then sa.usuario_receptor_id
          else sa.usuario_solicitante_id
        end,
        new.usuario_id,
        'voto_hoy',
        new.local_id,
        new.evento_id
      from public.solicitudes_amistad sa
      where sa.estado = 'aceptada'
        and (sa.usuario_solicitante_id = new.usuario_id or sa.usuario_receptor_id = new.usuario_id);
    end if;
  end if;

  return new;
end;
$$;

-- Misma política de ejecución que ya tenía: nadie la llama directamente,
-- el motor la dispara igual desde el trigger existente.
revoke execute on function public.notificar_voto_seguidores() from public;
revoke execute on function public.notificar_voto_seguidores() from authenticated;

-- No se toca el trigger "votos_notificar_seguidores" (0010): mismo nombre
-- de función, misma firma, sigue apuntando aquí sin recrearlo.
-- No se toca la tabla "seguimientos": se conserva íntegra, con sus datos.
-- No se toca RLS, el sistema admin, "solicitudes_amistad" ni ninguna
-- otra función.

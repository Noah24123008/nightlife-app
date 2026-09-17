-- ============================================================
-- Migración: sistema de amistades (Fase 1)
-- Solo tabla, RLS, funciones de escritura/lectura y migración de
-- datos históricos desde "seguimientos". No se crea ningún trigger
-- de notificación en esta fase, ni se modifica ni se borra nada de
-- "seguimientos": se lee únicamente para construir el estado inicial.
-- No se toca ningún archivo de frontend.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla
-- ------------------------------------------------------------

create table public.solicitudes_amistad (
  id uuid primary key default gen_random_uuid(),
  usuario_solicitante_id uuid not null references auth.users(id) on delete cascade,
  usuario_receptor_id uuid not null references auth.users(id) on delete cascade,
  usuario_menor_id uuid generated always as (least(usuario_solicitante_id, usuario_receptor_id)) stored,
  usuario_mayor_id uuid generated always as (greatest(usuario_solicitante_id, usuario_receptor_id)) stored,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint solicitudes_amistad_no_auto check (usuario_solicitante_id <> usuario_receptor_id),
  unique (usuario_menor_id, usuario_mayor_id)
);

-- ------------------------------------------------------------
-- 2) RLS
-- ------------------------------------------------------------

alter table public.solicitudes_amistad enable row level security;

create policy "Solicitudes - leer las propias"
  on public.solicitudes_amistad for select
  using (auth.uid() = usuario_solicitante_id or auth.uid() = usuario_receptor_id);

-- Pendiente: solo quien la envió puede cancelarla borrándola.
-- El receptor de una pendiente no tiene ningún camino de borrado directo;
-- su única vía es responder_solicitud_amistad(..., false).
-- Aceptada o rechazada: cualquiera de las dos partes puede borrar la fila
-- (eliminar amistad, o limpiar un rechazo).
create policy "Solicitudes - borrar según estado"
  on public.solicitudes_amistad for delete
  using (
    (estado = 'pendiente' and auth.uid() = usuario_solicitante_id)
    or (
      estado in ('aceptada', 'rechazada')
      and (auth.uid() = usuario_solicitante_id or auth.uid() = usuario_receptor_id)
    )
  );

-- ------------------------------------------------------------
-- 3) Permisos de tabla: sin insert/update directo para nadie.
-- Toda escritura real pasa por las funciones de la sección 4.
-- ------------------------------------------------------------

revoke all on table public.solicitudes_amistad from public;
revoke all on table public.solicitudes_amistad from anon;
revoke all on table public.solicitudes_amistad from authenticated;

grant select, delete on table public.solicitudes_amistad to authenticated;

-- ------------------------------------------------------------
-- 4) Funciones de escritura (security definer, con comprobaciones
-- explícitas de autenticación y validación de argumentos)
-- ------------------------------------------------------------

create or replace function public.enviar_solicitud_amistad(p_destinatario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
  v_menor uuid;
  v_mayor uuid;
  v_insertado_id uuid;
  v_fila record;
begin
  if v_yo is null then
    raise exception 'No autenticado.';
  end if;

  if p_destinatario is null then
    raise exception 'Falta el destinatario.';
  end if;

  if v_yo = p_destinatario then
    raise exception 'No puedes enviarte una solicitud a ti mismo.';
  end if;

  v_menor := least(v_yo, p_destinatario);
  v_mayor := greatest(v_yo, p_destinatario);

  -- Intento atómico: si no existía fila para esta pareja, la propia
  -- restricción "unique" decide, no una lectura previa — así que dos
  -- llamadas simultáneas (A→B y B→A) nunca pueden colarse las dos a la
  -- vez ni terminar en un error de unique violation.
  insert into public.solicitudes_amistad (usuario_solicitante_id, usuario_receptor_id, estado)
  values (v_yo, p_destinatario, 'pendiente')
  on conflict (usuario_menor_id, usuario_mayor_id) do nothing
  returning id into v_insertado_id;

  if v_insertado_id is not null then
    return;
  end if;

  -- Ya existía fila para esta pareja: la bloqueamos y decidimos según
  -- su estado real.
  select * into v_fila
  from public.solicitudes_amistad
  where usuario_menor_id = v_menor and usuario_mayor_id = v_mayor
  for update;

  if v_fila.estado = 'aceptada' then
    raise exception 'Ya sois amigos.';
  end if;

  if v_fila.estado = 'pendiente' then
    if v_fila.usuario_solicitante_id = v_yo then
      raise exception 'Ya existe una solicitud pendiente.';
    else
      raise exception 'Esta persona ya te ha enviado una solicitud. Respóndela en vez de enviar otra.';
    end if;
  end if;

  -- estado = 'rechazada': se reutiliza la misma fila, invirtiendo
  -- solicitante/receptor según quién llama ahora.
  update public.solicitudes_amistad
  set usuario_solicitante_id = v_yo,
      usuario_receptor_id = p_destinatario,
      estado = 'pendiente',
      actualizado_en = now()
  where id = v_fila.id;
end;
$$;

revoke execute on function public.enviar_solicitud_amistad(uuid) from public;
grant execute on function public.enviar_solicitud_amistad(uuid) to authenticated;

create or replace function public.responder_solicitud_amistad(p_solicitud_id uuid, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
  v_fila record;
begin
  if v_yo is null then
    raise exception 'No autenticado.';
  end if;

  if p_solicitud_id is null then
    raise exception 'Falta el id de la solicitud.';
  end if;

  if p_aceptar is null then
    raise exception 'Falta indicar si se acepta o rechaza la solicitud.';
  end if;

  select * into v_fila
  from public.solicitudes_amistad
  where id = p_solicitud_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_fila.usuario_receptor_id <> v_yo then
    raise exception 'Solo quien recibe la solicitud puede responderla.';
  end if;

  if v_fila.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya no está pendiente.';
  end if;

  update public.solicitudes_amistad
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      actualizado_en = now()
  where id = p_solicitud_id;
end;
$$;

revoke execute on function public.responder_solicitud_amistad(uuid, boolean) from public;
grant execute on function public.responder_solicitud_amistad(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 5) Lectura pública autenticada de amigos de cualquier perfil
-- ------------------------------------------------------------

create or replace function public.get_amigos(p_usuario_id uuid)
returns table (
  id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nombre, p.nombre_usuario, p.foto_url
  from public.solicitudes_amistad sa
  join public.profiles p
    on p.id = case
      when sa.usuario_solicitante_id = p_usuario_id then sa.usuario_receptor_id
      else sa.usuario_solicitante_id
    end
  where sa.estado = 'aceptada'
    and (sa.usuario_solicitante_id = p_usuario_id or sa.usuario_receptor_id = p_usuario_id)
  order by coalesce(p.nombre_usuario, p.nombre, '') asc;
$$;

revoke execute on function public.get_amigos(uuid) from public;
grant execute on function public.get_amigos(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) Migración de datos históricos desde "seguimientos"
-- Solo lectura de seguimientos; no se modifica ni se borra esa tabla.
-- ------------------------------------------------------------

-- Mutuos (A sigue a B y B sigue a A) → amistad ya aceptada, una sola fila
-- por pareja. "seguidor_id < seguido_id" evita procesar cada pareja
-- mutua dos veces (una por cada dirección del follow).
insert into public.solicitudes_amistad (usuario_solicitante_id, usuario_receptor_id, estado)
select distinct
  least(s1.seguidor_id, s1.seguido_id),
  greatest(s1.seguidor_id, s1.seguido_id),
  'aceptada'
from public.seguimientos s1
join public.seguimientos s2
  on s2.seguidor_id = s1.seguido_id and s2.seguido_id = s1.seguidor_id
where s1.seguidor_id < s1.seguido_id
on conflict (usuario_menor_id, usuario_mayor_id) do nothing;

-- Unilaterales (solo A sigue a B) → solicitud pendiente, en la dirección
-- real del follow. Se excluyen explícitamente los pares ya tratados como
-- mutuos arriba.
insert into public.solicitudes_amistad (usuario_solicitante_id, usuario_receptor_id, estado)
select s.seguidor_id, s.seguido_id, 'pendiente'
from public.seguimientos s
where not exists (
  select 1 from public.seguimientos s2
  where s2.seguidor_id = s.seguido_id and s2.seguido_id = s.seguidor_id
)
on conflict (usuario_menor_id, usuario_mayor_id) do nothing;

-- ------------------------------------------------------------
-- 7) Comprobaciones (solo lectura, para verificar el resultado)
-- ------------------------------------------------------------

select count(*) as amistades_aceptadas
from public.solicitudes_amistad
where estado = 'aceptada';

select count(*) as solicitudes_pendientes
from public.solicitudes_amistad
where estado = 'pendiente';

select count(*) as solicitudes_rechazadas
from public.solicitudes_amistad
where estado = 'rechazada';

-- Debe dar 0: confirma que no hay dos filas para la misma pareja.
select count(*) as parejas_duplicadas
from (
  select usuario_menor_id, usuario_mayor_id, count(*) as n
  from public.solicitudes_amistad
  group by usuario_menor_id, usuario_mayor_id
  having count(*) > 1
) duplicados;

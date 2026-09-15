-- ============================================================
-- Migración: Panel de Administración V1
--
-- Resumen de lo que añade:
--   1. profiles.rol ('usuario' | 'admin'), protegido por un trigger
--      para que ningún cliente pueda auto-ascenderse a admin.
--   2. es_admin(uuid): helper reutilizado por todas las RPCs de abajo.
--   3. RPCs administrativas para locales, eventos, usuarios y
--      métricas — TODAS comprueban es_admin(auth.uid()) antes de
--      hacer nada. No se añade ninguna política RLS de INSERT/UPDATE
--      en locales/eventos: siguen sin poder escribirse desde el
--      cliente salvo a través de estas funciones SECURITY DEFINER,
--      que son la única puerta de entrada y donde vive toda la
--      autorización.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rol de perfil, protegido
-- ------------------------------------------------------------

alter table public.profiles
  add column if not exists rol text not null default 'usuario';

alter table public.profiles
  add constraint profiles_rol_check check (rol in ('usuario', 'admin'));

-- Protección contra escalada de privilegios: la política actual
-- "Perfil propio - edición" permite a cualquier usuario actualizar su
-- propia fila sin restricción de columnas (RLS no distingue columnas).
-- Este trigger bloquea específicamente cambios en "rol" cuando la
-- actualización llega desde un cliente autenticado normal (auth.uid()
-- no es null). Cuando se ejecuta una sentencia SQL directa desde el
-- SQL Editor de Supabase (sin contexto de JWT), auth.uid() es null y
-- el cambio de rol sí se permite — así es como se asigna el primer
-- admin, ver el bloque de instrucciones al final de este archivo.
create or replace function public.proteger_rol_perfil()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.rol is distinct from old.rol then
    new.rol := old.rol;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_proteger_rol on public.profiles;
create trigger profiles_proteger_rol
  before update on public.profiles
  for each row execute function public.proteger_rol_perfil();

-- ------------------------------------------------------------
-- 2. Helper es_admin()
-- ------------------------------------------------------------

create or replace function public.es_admin(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = p_usuario_id and rol = 'admin'
  );
$$;

revoke execute on function public.es_admin(uuid) from public;
grant execute on function public.es_admin(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. Locales — crear/editar (upsert) y activar/desactivar
-- ------------------------------------------------------------

create or replace function public.admin_guardar_local(
  p_id uuid default null,
  p_ciudad_id uuid default null,
  p_nombre text default null,
  p_descripcion text default null,
  p_direccion text default null,
  p_categoria text default null,
  p_foto_url text default null,
  p_horario text default null,
  p_activo boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_nombre is null or trim(p_nombre) = '' then
    raise exception 'El nombre del local es obligatorio';
  end if;

  if p_ciudad_id is null then
    raise exception 'La ciudad es obligatoria';
  end if;

  if p_id is null then
    insert into public.locales (ciudad_id, nombre, descripcion, direccion, categoria, foto_url, horario, activo)
    values (p_ciudad_id, p_nombre, p_descripcion, p_direccion, p_categoria, p_foto_url, p_horario, coalesce(p_activo, true))
    returning id into v_id;
  else
    update public.locales
    set
      ciudad_id = p_ciudad_id,
      nombre = p_nombre,
      descripcion = p_descripcion,
      direccion = p_direccion,
      categoria = p_categoria,
      foto_url = p_foto_url,
      horario = p_horario,
      activo = coalesce(p_activo, activo)
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.admin_guardar_local(uuid, uuid, text, text, text, text, text, text, boolean) from public;
grant execute on function public.admin_guardar_local(uuid, uuid, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.admin_toggle_local_activo(p_local_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activo boolean;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  update public.locales set activo = not activo where id = p_local_id
  returning activo into v_activo;

  return v_activo;
end;
$$;

revoke execute on function public.admin_toggle_local_activo(uuid) from public;
grant execute on function public.admin_toggle_local_activo(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Eventos — crear/editar (upsert) y activar/desactivar
--    (eventos.activo ya existía desde 0001; se reutiliza, no se
--    añade ningún campo nuevo ni se borra físicamente ninguna fila).
-- ------------------------------------------------------------

create or replace function public.admin_guardar_evento(
  p_id uuid default null,
  p_local_id uuid default null,
  p_nombre text default null,
  p_descripcion text default null,
  p_fecha date default null,
  p_hora_inicio time default null,
  p_hora_fin time default null,
  p_foto_url text default null,
  p_activo boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_nombre is null or trim(p_nombre) = '' then
    raise exception 'El nombre del evento es obligatorio';
  end if;

  if p_local_id is null then
    raise exception 'El local es obligatorio';
  end if;

  if p_fecha is null then
    raise exception 'La fecha es obligatoria';
  end if;

  if p_id is null then
    insert into public.eventos (local_id, nombre, descripcion, fecha, hora_inicio, hora_fin, foto_url, activo)
    values (p_local_id, p_nombre, p_descripcion, p_fecha, p_hora_inicio, p_hora_fin, p_foto_url, coalesce(p_activo, true))
    returning id into v_id;
  else
    update public.eventos
    set
      local_id = p_local_id,
      nombre = p_nombre,
      descripcion = p_descripcion,
      fecha = p_fecha,
      hora_inicio = p_hora_inicio,
      hora_fin = p_hora_fin,
      foto_url = p_foto_url,
      activo = coalesce(p_activo, activo)
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.admin_guardar_evento(uuid, uuid, text, text, date, time, time, text, boolean) from public;
grant execute on function public.admin_guardar_evento(uuid, uuid, text, text, date, time, time, text, boolean) to authenticated;

create or replace function public.admin_toggle_evento_activo(p_evento_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activo boolean;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  update public.eventos set activo = not activo where id = p_evento_id
  returning activo into v_activo;

  return v_activo;
end;
$$;

revoke execute on function public.admin_toggle_evento_activo(uuid) from public;
grant execute on function public.admin_toggle_evento_activo(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. Usuarios — listado de solo lectura para el panel
--    profiles.email ya es una copia propia de la tabla (poblada por
--    el trigger handle_new_user en 0001), no auth.users — no hace
--    falta service_role para leerla.
-- ------------------------------------------------------------

create or replace function public.admin_listar_usuarios()
returns table (
  id uuid,
  nombre text,
  nombre_usuario text,
  foto_url text,
  email text,
  rol text,
  creado_en timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nombre, p.nombre_usuario, p.foto_url, p.email, p.rol, p.creado_en
  from public.profiles p
  where public.es_admin(auth.uid())
  order by p.creado_en desc;
$$;

revoke execute on function public.admin_listar_usuarios() from public;
grant execute on function public.admin_listar_usuarios() to authenticated;

-- ------------------------------------------------------------
-- 6. Métricas básicas del dashboard
--    total_usuarios necesita saltarse RLS de profiles (por eso va
--    aquí); locales_activos/eventos_proximos/votos_hoy ya eran
--    legibles por cualquier autenticado sin este RPC (locales/eventos
--    tienen lectura pública, votos lectura para autenticados), pero
--    se agrupan igualmente aquí para que el dashboard haga una sola
--    llamada coherente.
-- ------------------------------------------------------------

create or replace function public.admin_metricas()
returns table (
  total_usuarios bigint,
  locales_activos bigint,
  eventos_proximos bigint,
  votos_hoy bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles) as total_usuarios,
    (select count(*) from public.locales where activo = true) as locales_activos,
    (select count(*) from public.eventos where activo = true and fecha >= (now() at time zone 'Europe/Madrid')::date) as eventos_proximos,
    (select count(*) from public.votos where fecha = (now() at time zone 'Europe/Madrid')::date) as votos_hoy
  where public.es_admin(auth.uid());
$$;

revoke execute on function public.admin_metricas() from public;
grant execute on function public.admin_metricas() to authenticated;

-- ============================================================
-- INSTRUCCIONES PARA ASIGNAR EL PRIMER ADMINISTRADOR
-- (ejecutar manualmente en el SQL Editor de Supabase, DESPUÉS de
-- aplicar esta migración — ver el informe final para más detalle)
-- ============================================================
-- update public.profiles set rol = 'admin' where id = 'TU-UUID-AQUI';

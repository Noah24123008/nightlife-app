-- ============================================================
-- Migración: canal de feedback interno para la beta.
--
-- Tabla nueva feedback_beta — no se toca ninguna tabla existente.
--
-- SEGURIDAD, por diseño:
--   - INSERT: cualquier autenticado puede crear feedback, pero SOLO con
--     su propio usuario_id — with check (auth.uid() = usuario_id), el
--     mismo patrón ya usado en "votos". Un usuario_id falso enviado
--     desde el cliente es rechazado por Postgres, no por el frontend.
--   - SELECT/UPDATE/DELETE: sin ninguna política para "authenticated" —
--     con RLS activa y ninguna política para una operación, esa
--     operación queda denegada por defecto (mismo razonamiento ya
--     verificado para locales/eventos). Un usuario normal no puede leer
--     NINGÚN feedback (ni el suyo ni el de otros), no puede modificarlo
--     ni borrarlo, por ninguna vía directa del cliente.
--   - Lectura y cambio de estado para admin: dos RPCs SECURITY DEFINER
--     que comprueban es_admin(auth.uid()) explícitamente, exactamente
--     el mismo patrón ya usado por admin_listar_usuarios/admin_metricas
--     y admin_guardar_local/admin_toggle_local_activo (0025). No se
--     crea ninguna política RLS nueva para el rol admin: el acceso
--     administrativo pasa siempre por estas dos funciones, igual que ya
--     pasa con locales/eventos/usuarios.
--
-- usuario_id referencia auth.users(id) on delete cascade: si alguien
-- elimina su cuenta (Edge Function eliminar-cuenta ya existente), su
-- feedback se limpia automáticamente igual que el resto de sus datos —
-- sin tocar esa función ni su lógica.
-- ============================================================

create table public.feedback_beta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('problema', 'idea', 'no_se_entiende')),
  mensaje text not null check (char_length(trim(mensaje)) > 0 and char_length(mensaje) <= 1000),
  ruta_actual text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'revisado', 'resuelto')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_beta_estado_idx on public.feedback_beta (estado);
create index if not exists feedback_beta_created_at_idx on public.feedback_beta (created_at desc);

alter table public.feedback_beta enable row level security;

create policy "Feedback - crear propio" on public.feedback_beta
  for insert
  with check (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- RPC admin: listar feedback, con nombre/username del autor (nunca el
-- email, no hace falta para este MVP). Mismo patrón que
-- admin_listar_usuarios: sin filas si el llamador no es admin.
-- ------------------------------------------------------------

create or replace function public.admin_listar_feedback()
returns table (
  id uuid,
  usuario_id uuid,
  nombre text,
  nombre_usuario text,
  tipo text,
  mensaje text,
  ruta_actual text,
  estado text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.usuario_id,
    p.nombre,
    p.nombre_usuario,
    f.tipo,
    f.mensaje,
    f.ruta_actual,
    f.estado,
    f.created_at
  from public.feedback_beta f
  left join public.profiles p on p.id = f.usuario_id
  where public.es_admin(auth.uid())
  order by f.created_at desc;
$$;

revoke execute on function public.admin_listar_feedback() from public;
grant execute on function public.admin_listar_feedback() to authenticated;

-- ------------------------------------------------------------
-- RPC admin: cambiar estado. Mismo patrón que
-- admin_toggle_local_activo: comprobación explícita al principio,
-- antes de tocar ningún dato.
-- ------------------------------------------------------------

create or replace function public.admin_cambiar_estado_feedback(p_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_estado not in ('nuevo', 'revisado', 'resuelto') then
    raise exception 'Estado no válido.';
  end if;

  update public.feedback_beta
  set estado = p_estado
  where id = p_id;
end;
$$;

revoke execute on function public.admin_cambiar_estado_feedback(uuid, text) from public;
grant execute on function public.admin_cambiar_estado_feedback(uuid, text) to authenticated;

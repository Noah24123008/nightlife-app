-- ============================================================
-- Migración: perfil público (solo campos no sensibles)
-- ============================================================

create or replace function public.get_perfil_publico(perfil_id uuid)
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
  select id, nombre, nombre_usuario, foto_url
  from public.profiles
  where id = perfil_id;
$$;

-- Solo usuarios autenticados de la app pueden llamarla; nunca devuelve email
-- ni ninguna otra columna, sea quien sea quien la invoque.
revoke execute on function public.get_perfil_publico(uuid) from public;
grant execute on function public.get_perfil_publico(uuid) to authenticated;

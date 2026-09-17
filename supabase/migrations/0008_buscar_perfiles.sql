-- ============================================================
-- Migración: búsqueda de perfiles públicos
-- ============================================================

create or replace function public.buscar_perfiles_publicos(termino text)
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
  where nombre ilike '%' || termino || '%'
     or nombre_usuario ilike '%' || termino || '%'
  order by nombre nulls last
  limit 20;
$$;

revoke execute on function public.buscar_perfiles_publicos(text) from public;
grant execute on function public.buscar_perfiles_publicos(text) to authenticated;

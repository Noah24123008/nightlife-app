-- ============================================================
-- Migración: perfiles públicos de varios usuarios a la vez
-- ============================================================

create or replace function public.get_perfiles_publicos(perfil_ids uuid[])
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
  where id = any(perfil_ids);
$$;

-- Mismo criterio de seguridad que get_perfil_publico: solo autenticados,
-- y nunca devuelve email ni ninguna otra columna.
revoke execute on function public.get_perfiles_publicos(uuid[]) from public;
grant execute on function public.get_perfiles_publicos(uuid[]) to authenticated;

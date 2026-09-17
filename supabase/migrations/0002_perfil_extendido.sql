-- ============================================================
-- Migración: perfil extendido (nombre de usuario y foto)
-- ============================================================

alter table public.profiles
  add column if not exists nombre_usuario text,
  add column if not exists foto_url text;

alter table public.profiles
  add constraint profiles_nombre_usuario_key unique (nombre_usuario);

-- Antes solo existían políticas de lectura y edición del propio perfil.
-- Esta permite crearlo de forma segura si por algún motivo no existiera
-- todavía (el alta normal ya lo crea automáticamente vía trigger).
create policy "Perfil propio - creación" on public.profiles
  for insert with check (auth.uid() = id);

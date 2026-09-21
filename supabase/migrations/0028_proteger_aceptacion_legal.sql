-- ============================================================
-- Migración: endurecer el registro de aceptación legal.
--
-- PROBLEMA: terminos_aceptados_en / privacidad_informada_en /
-- version_terminos / version_privacidad (añadidas en 0027) quedaban
-- cubiertas por la política genérica "Perfil propio - edición"
-- (auth.uid() = id, sin restricción de columnas) — un usuario
-- autenticado podía escribirlas directamente desde DevTools con
-- cualquier timestamp/versión que quisiera.
--
-- SOLUCIÓN, mismo patrón ya usado para "rol" en 0025
-- (proteger_rol_perfil): un trigger BEFORE UPDATE revierte cualquier
-- cambio a estas 4 columnas cuando la petición viene de un cliente
-- autenticado (auth.uid() no es null) — CON UNA EXCEPCIÓN: la propia
-- RPC registrar_aceptacion_legal() marca, justo antes de su UPDATE,
-- una bandera local a la transacción (set_config con is_local=true,
-- se olvida sola al terminar la transacción) que el trigger reconoce
-- para dejar pasar SU escritura. Cualquier otro UPDATE directo —
-- desde DevTools, desde otra función, desde donde sea— no lleva esa
-- bandera y se revierte igual que ya ocurre con "rol".
--
-- No se toca ninguna política RLS existente. No se toca "rol" ni su
-- protección de 0025.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Trigger de protección (BEFORE UPDATE, igual alcance que
-- proteger_rol_perfil: solo UPDATE, no INSERT — el alta normal ya
-- crea el perfil vía handle_new_user() sin tocar estos campos).
-- ------------------------------------------------------------

create or replace function public.proteger_aceptacion_legal()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('noctup.permitir_aceptacion_legal', true), 'false') <> 'true'
  then
    if new.terminos_aceptados_en is distinct from old.terminos_aceptados_en
       or new.privacidad_informada_en is distinct from old.privacidad_informada_en
       or new.version_terminos is distinct from old.version_terminos
       or new.version_privacidad is distinct from old.version_privacidad
    then
      new.terminos_aceptados_en := old.terminos_aceptados_en;
      new.privacidad_informada_en := old.privacidad_informada_en;
      new.version_terminos := old.version_terminos;
      new.version_privacidad := old.version_privacidad;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_proteger_aceptacion_legal on public.profiles;
create trigger profiles_proteger_aceptacion_legal
  before update on public.profiles
  for each row execute function public.proteger_aceptacion_legal();

-- ------------------------------------------------------------
-- 2) RPC segura: único camino legítimo para escribir esos 4 campos.
-- ------------------------------------------------------------

create or replace function public.registrar_aceptacion_legal(
  p_version_terminos text,
  p_version_privacidad text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
begin
  if v_yo is null then
    raise exception 'No autenticado.';
  end if;

  if p_version_terminos is null or trim(p_version_terminos) = '' then
    raise exception 'Falta la versión de los términos.';
  end if;

  if p_version_privacidad is null or trim(p_version_privacidad) = '' then
    raise exception 'Falta la versión de la política de privacidad.';
  end if;

  -- Bandera local a esta transacción: permite que el UPDATE de abajo
  -- pase el trigger de protección. Se olvida sola al terminar (nunca
  -- persiste entre llamadas ni conexiones).
  perform set_config('noctup.permitir_aceptacion_legal', 'true', true);

  update public.profiles
  set
    terminos_aceptados_en = now(),
    privacidad_informada_en = now(),
    version_terminos = p_version_terminos,
    version_privacidad = p_version_privacidad
  where id = v_yo;
end;
$$;

revoke execute on function public.registrar_aceptacion_legal(text, text) from public;
grant execute on function public.registrar_aceptacion_legal(text, text) to authenticated;

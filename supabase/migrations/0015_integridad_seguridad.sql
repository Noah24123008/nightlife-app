-- ============================================================
-- Migración: integridad de votos (evento debe pertenecer al local)
-- y endurecimiento de seguridad de handle_new_user()
-- No se modifican datos existentes, RLS ni el frontend.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Coherencia evento_id / local_id en votos
-- ------------------------------------------------------------
-- Un CHECK no puede consultar otra tabla, así que la validación se hace
-- con un trigger: si evento_id no es null, su local_id debe coincidir
-- exactamente con el local_id del voto.

create or replace function public.validar_evento_pertenece_a_local()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_id_evento uuid;
begin
  if new.evento_id is not null then
    select local_id into v_local_id_evento
    from public.eventos
    where id = new.evento_id;

    if v_local_id_evento is null then
      raise exception 'El evento % no existe.', new.evento_id;
    end if;

    if v_local_id_evento <> new.local_id then
      raise exception
        'El evento % pertenece al local %, no al local % indicado en el voto.',
        new.evento_id, v_local_id_evento, new.local_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger votos_validar_evento_local
  before insert or update on public.votos
  for each row execute function public.validar_evento_pertenece_a_local();

-- No necesita ser ejecutable directamente: el motor la invoca internamente
-- desde el trigger, no a través del rol que hace el insert/update.
revoke execute on function public.validar_evento_pertenece_a_local() from public;
revoke execute on function public.validar_evento_pertenece_a_local() from authenticated;

-- ------------------------------------------------------------
-- 2) Endurecer handle_new_user() sin cambiar qué hace
-- ------------------------------------------------------------
-- Mismo nombre y firma que en 0001_init.sql, así que el trigger
-- on_auth_user_created (que ya apunta a ella) sigue funcionando sin
-- necesidad de recrearlo. Único cambio real: set search_path = public.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from authenticated;

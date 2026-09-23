-- ============================================================
-- Migración: atribución interna para la beta (qué persona semilla
-- trajo a cada usuario registrado). Solo estructura — los 10 códigos
-- se insertan aparte, en un INSERT separado (ver entrega), para
-- mantener esquema y datos desacoplados.
--
-- No modifica handle_new_user() (0001/0015): se crea una función y un
-- trigger AFTER INSERT independientes sobre auth.users, con su propio
-- manejo de errores, para no arriesgar el alta de perfil ya existente
-- ni acoplar dos responsabilidades distintas en la misma función.
-- ============================================================

create table public.beta_invitaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  etiqueta text not null,
  activa boolean not null default true,
  max_usos integer null,
  created_at timestamptz not null default now()
);

create table public.beta_referidos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  invitacion_id uuid not null references public.beta_invitaciones(id),
  created_at timestamptz not null default now()
);

create index if not exists beta_referidos_invitacion_id_idx on public.beta_referidos (invitacion_id);

-- ------------------------------------------------------------
-- RLS activa, sin ninguna policy para anon/authenticated: con RLS
-- activada y ninguna policy para una operación, esa operación queda
-- denegada por defecto (mismo razonamiento ya verificado en el
-- proyecto para locales/eventos/feedback_beta). Ningún usuario normal
-- necesita leer ni escribir directamente estas tablas — toda la
-- escritura pasa por el trigger SECURITY DEFINER de abajo, que corre
-- con los privilegios de quien lo definió, no como "authenticated", y
-- por tanto no depende de ningún GRANT ni policy sobre estas tablas.
-- ------------------------------------------------------------

alter table public.beta_invitaciones enable row level security;
alter table public.beta_referidos enable row level security;

-- Explícito y defensivo, aunque redundante con "sin políticas": deja
-- constancia de que ni anon ni authenticated deben tener ningún
-- privilegio de tabla aquí, sea cual sea la configuración por defecto
-- del proyecto en el momento de crear estas tablas.
revoke all on table public.beta_invitaciones from anon, authenticated;
revoke all on table public.beta_referidos from anon, authenticated;

-- ------------------------------------------------------------
-- Trigger independiente: lee beta_ref de los metadatos del registro,
-- busca una invitación activa con ese código y, si existe, asocia al
-- usuario. Cualquier fallo (código inexistente, código vacío, error
-- inesperado) se traga en silencio — NUNCA debe impedir el alta del
-- usuario, que es la prioridad absoluta de este trigger.
-- ------------------------------------------------------------

create or replace function public.registrar_beta_referido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_invitacion_id uuid;
begin
  v_ref := new.raw_user_meta_data->>'beta_ref';

  if v_ref is null or trim(v_ref) = '' then
    return new;
  end if;

  v_ref := upper(trim(v_ref));

  select id into v_invitacion_id
  from public.beta_invitaciones
  where codigo = v_ref
    and activa = true
  limit 1;

  if v_invitacion_id is null then
    return new;
  end if;

  insert into public.beta_referidos (usuario_id, invitacion_id)
  values (new.id, v_invitacion_id)
  on conflict (usuario_id) do nothing;

  return new;
exception
  when others then
    -- Defensa adicional: cualquier error no previsto aquí no debe
    -- poder romper el alta del usuario (este trigger corre AFTER
    -- INSERT en auth.users, dentro de la misma transacción).
    return new;
end;
$$;

revoke execute on function public.registrar_beta_referido() from public;
revoke execute on function public.registrar_beta_referido() from authenticated;

drop trigger if exists on_auth_user_created_beta_ref on auth.users;
create trigger on_auth_user_created_beta_ref
  after insert on auth.users
  for each row execute function public.registrar_beta_referido();

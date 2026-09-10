-- ============================================================
-- Migración inicial: ciudades, locales, eventos, perfiles, votos
-- ============================================================

create extension if not exists "pgcrypto";

-- CIUDADES
create table public.ciudades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default true
);

-- LOCALES (cargados por el equipo, no por los usuarios)
create table public.locales (
  id uuid primary key default gen_random_uuid(),
  ciudad_id uuid not null references public.ciudades(id) on delete restrict,
  nombre text not null,
  descripcion text,
  direccion text,
  categoria text,
  foto_url text,
  horario text,
  activo boolean not null default true
);

-- EVENTOS (siempre asociados a un local, cargados por el equipo)
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locales(id) on delete cascade,
  nombre text not null,
  descripcion text,
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  foto_url text,
  activo boolean not null default true
);

-- PERFILES (extiende auth.users con datos propios de la app)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  ciudad_preferida_id uuid references public.ciudades(id),
  creado_en timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- VOTOS ("Voy"): siempre apunta a un local; el evento es opcional
create table public.votos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  local_id uuid not null references public.locales(id) on delete cascade,
  evento_id uuid references public.eventos(id) on delete set null,
  fecha date not null default current_date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Restricción clave: un único voto activo por usuario y día
  unique (usuario_id, fecha)
);

create or replace function public.set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger votos_actualizado_en
  before update on public.votos
  for each row execute function public.set_actualizado_en();

-- ============================================================
-- Seguridad a nivel de fila (RLS)
-- ============================================================

alter table public.ciudades enable row level security;
alter table public.locales enable row level security;
alter table public.eventos enable row level security;
alter table public.profiles enable row level security;
alter table public.votos enable row level security;

-- Catálogo (ciudades, locales, eventos): lectura pública, escritura solo desde
-- el panel de Supabase con la service role (no hay pantalla de administración en el MVP)
create policy "Lectura pública de ciudades" on public.ciudades for select using (true);
create policy "Lectura pública de locales" on public.locales for select using (true);
create policy "Lectura pública de eventos" on public.eventos for select using (true);

-- Perfiles: cada usuario ve y edita solo el suyo
create policy "Perfil propio - lectura" on public.profiles for select using (auth.uid() = id);
create policy "Perfil propio - edición" on public.profiles for update using (auth.uid() = id);

-- Votos: cualquier usuario autenticado puede leer (necesario para calcular el
-- ranking agregado), pero solo puede crear/editar/borrar sus propios votos.
create policy "Lectura de votos (autenticados)" on public.votos for select using (auth.role() = 'authenticated');
create policy "Crear voto propio" on public.votos for insert with check (auth.uid() = usuario_id);
create policy "Editar voto propio" on public.votos for update using (auth.uid() = usuario_id);
create policy "Borrar voto propio" on public.votos for delete using (auth.uid() = usuario_id);

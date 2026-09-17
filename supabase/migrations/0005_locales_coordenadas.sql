-- ============================================================
-- Migración: coordenadas de los locales (para el mapa)
-- ============================================================

alter table public.locales
  add column if not exists latitud double precision,
  add column if not exists longitud double precision;

alter table public.locales
  add constraint locales_latitud_rango check (latitud is null or (latitud between -90 and 90)),
  add constraint locales_longitud_rango check (longitud is null or (longitud between -180 and 180));

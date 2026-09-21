-- ============================================================
-- Migración: aceptación de Términos de uso y Política de privacidad.
--
-- Cuatro columnas nullable en profiles — no rompe ningún perfil
-- existente. Los usuarios actuales quedan con estos 4 campos en NULL;
-- el frontend les pedirá confirmarlo una sola vez (ver AppLayout /
-- AceptacionLegalModal), sin bloquear login ni ningún otro flujo.
--
-- Distinción deliberada, no dos columnas simétricas: los Términos de
-- uso SÍ se aceptan (es un contrato de uso); la Política de
-- privacidad se declara LEÍDA/INFORMADA, no "aceptada" — el
-- tratamiento de datos no debe presentarse como dependiente de un
-- consentimiento genérico de tipo contractual.
--
-- No se toca RLS: la política "Perfil propio - edición" ya existente
-- (auth.uid() = id, sin restricción de columnas) ya permite que cada
-- usuario escriba estos 4 campos en su propia fila, igual que ya
-- puede escribir nombre/nombre_usuario/foto_url. No hace falta
-- ninguna política ni función nueva para esto.
-- ============================================================

alter table public.profiles
  add column if not exists terminos_aceptados_en timestamptz,
  add column if not exists privacidad_informada_en timestamptz,
  add column if not exists version_terminos text,
  add column if not exists version_privacidad text;

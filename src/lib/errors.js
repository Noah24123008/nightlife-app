const PISTAS_AUTENTICACION = [
  'jwt expired',
  'invalid jwt',
  'jwt',
  'invalid refresh token',
  'refresh token not found',
  'session not found',
  'session expired',
  'not authenticated',
  'unauthorized',
]

// Detecta si un error de Supabase (de una consulta, RPC o de auth) es,
// con razonable seguridad, un problema de sesión/autenticación y no un
// fallo genérico (dato no encontrado, restricción violada, red, etc.).
export function esErrorDeAutenticacion(error) {
  if (!error) return false

  const status = error.status ?? error.statusCode
  if (status === 401) return true

  const code = (error.code ?? '').toString().toLowerCase()
  if (code === 'pgrst301' || code === '401') return true

  const mensaje = (error.message ?? '').toLowerCase()
  return PISTAS_AUTENTICACION.some((pista) => mensaje.includes(pista))
}

// Devuelve un mensaje claro para el usuario: uno específico de sesión
// caducada si aplica, o el mensaje concreto que ya tenía cada pantalla.
export function mensajeError(error, fallback) {
  if (esErrorDeAutenticacion(error)) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  }
  return fallback
}

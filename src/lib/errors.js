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

// Traductor específico para los errores de Registro/Login/recuperación de
// contraseña (supabase.auth.*), distintos de los de sesión caducada de
// arriba. Nunca deja pasar el texto original de Supabase: si ningún
// patrón conocido coincide, devuelve un mensaje genérico en español en
// vez del error crudo.
const REGLAS_ERROR_AUTH = [
  { patron: /invalid login credentials/i, mensaje: 'Email o contraseña incorrectos.' },
  { patron: /user already registered|already registered|already exists/i, mensaje: 'Ya existe una cuenta con este email.' },
  { patron: /password.*(at least|should be).*character|password.*short|weak password/i, mensaje: 'La contraseña debe tener al menos 6 caracteres.' },
  { patron: /invalid email|unable to validate email|email.*invalid/i, mensaje: 'Ese email no parece válido.' },
  { patron: /email rate limit|too many requests|rate limit/i, mensaje: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' },
  { patron: /email link is invalid or has expired|otp_expired|token has expired|invalid or has expired|expired/i, mensaje: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' },
  { patron: /email not confirmed/i, mensaje: 'Confirma tu email antes de iniciar sesión.' },
  { patron: /same password|new password should be different/i, mensaje: 'La nueva contraseña debe ser distinta de la actual.' },
]

export function mensajeErrorAuth(error) {
  if (!error) return ''

  if (error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
  }

  const mensaje = (error.message ?? '').toString()

  if (!mensaje || /failed to fetch|networkerror|network request failed|load failed/i.test(mensaje)) {
    return 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.'
  }

  const regla = REGLAS_ERROR_AUTH.find((r) => r.patron.test(mensaje))
  if (regla) return regla.mensaje

  // Nunca se llega aquí con el texto original de Supabase visible.
  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}

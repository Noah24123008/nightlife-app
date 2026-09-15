// Nombre de trabajo de la app. Cambiar solo aquí si se decide otro nombre.
const NOMBRE_APP = 'NoctUp'

// Construye la URL pública del perfil usando la ruta que YA existe
// (/usuarios/:id) y el origen real del navegador (window.location.origin),
// así funciona igual en local, en Vercel o en cualquier dominio futuro sin
// tocar código.
export function construirEnlacePerfil(userId) {
  return `${window.location.origin}/usuarios/${userId}`
}

export function construirMensajeInvitacion(enlace) {
  return `Estoy usando ${NOMBRE_APP} para ver dónde salimos este finde 👀\nAgrégame y así vemos dónde va cada uno.\n${enlace}`
}

// Intenta compartir con el menú nativo del sistema (navigator.share); si no
// está disponible, copia el enlace al portapapeles. Devuelve 'compartido',
// 'copiado' o 'error', para que el componente que llama decida qué feedback
// mostrar (por ejemplo, el toast "Enlace copiado ✓" solo tiene sentido en
// el caso 'copiado').
export async function compartirPerfil(userId) {
  const enlace = construirEnlacePerfil(userId)
  const mensaje = construirMensajeInvitacion(enlace)

  if (navigator.share) {
    try {
      await navigator.share({ text: mensaje })
      return 'compartido'
    } catch (err) {
      // El usuario canceló el menú nativo (AbortError) u ocurrió otro fallo;
      // en ambos casos no hacemos nada más, no hay error real que mostrar.
      if (err?.name === 'AbortError') return 'cancelado'
      // Si falló por otra razón, seguimos con el fallback de copiar.
    }
  }

  try {
    await navigator.clipboard.writeText(mensaje)
    return 'copiado'
  } catch {
    return 'error'
  }
}

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAceptacionLegal } from '../lib/api'
import { VERSION_TERMINOS, VERSION_PRIVACIDAD } from '../lib/legal'

// Cubre tanto a los usuarios que ya existían antes de este sistema
// (version_terminos/version_privacidad en NULL) como a quienes en el
// futuro deban reconfirmar por un cambio de versión: en ambos casos la
// versión guardada no coincide con la constante actual.
export function useAceptacionLegalPendiente() {
  const { user } = useAuth()
  const [pendiente, setPendiente] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setPendiente(false)
      return
    }
    let activo = true
    getAceptacionLegal(user.id).then(({ data }) => {
      if (!activo || !data) return
      const desactualizado =
        data.version_terminos !== VERSION_TERMINOS || data.version_privacidad !== VERSION_PRIVACIDAD
      setPendiente(desactualizado)
    })
    return () => {
      activo = false
    }
  }, [user?.id])

  return { pendiente, marcarAceptado: () => setPendiente(false) }
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAmigos } from '../lib/api'
import PersonaChip from '../components/PersonaChip'
import { SkeletonPersonaFila } from '../components/Skeleton'
import BackButton from '../components/BackButton'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

// "seguidores" y "siguiendo" se conservan solo por compatibilidad con URLs
// antiguas (ya no hay ningún enlace de la app hacia ellas): muestran
// exactamente la misma lista de amigos que "amigos", no un sistema aparte.
const CONFIG_AMIGOS = {
  titulo: 'Amigos',
  vacio: 'Todavía no tiene amigos',
  cargar: getAmigos,
}

const CONFIG_POR_TIPO = {
  amigos: CONFIG_AMIGOS,
  seguidores: CONFIG_AMIGOS,
  siguiendo: CONFIG_AMIGOS,
}

export default function ListaSeguimiento() {
  const { id, tipo } = useParams()
  const { signOut } = useAuth()
  const config = CONFIG_POR_TIPO[tipo]

  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!config) return
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: errLista } = await config.cargar(id)
      if (!activo) return
      if (errLista) {
        setError(mensajeError(errLista, 'No se pudo cargar la lista.'))
        if (esErrorDeAutenticacion(errLista)) setTimeout(() => signOut(), 2000)
      } else {
        setPersonas(data ?? [])
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [id, tipo])

  if (!config) {
    return (
      <div className="app-screen amigos-v2">
        <div className="amigos-v2-contenido">
          <BackButton />
          <p className="inicio-vacio">Esta página no existe.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-screen amigos-v2">
      <div className="amigos-v2-contenido">
        <BackButton />

        <h1 className="amigos-v2-titulo">{config.titulo}</h1>

        {error && <p className="auth-error">{error}</p>}

        {cargando ? (
          <div className="votantes-lista votantes-lista--columna">
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
          </div>
        ) : personas.length === 0 ? (
          <p className="inicio-vacio">{config.vacio}</p>
        ) : (
          <div className="votantes-lista votantes-lista--columna">
            {personas.map((persona) => (
              <div key={persona.id} className="amigos-v2-fila">
                <PersonaChip perfil={persona} />
                <span className="amigos-v2-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

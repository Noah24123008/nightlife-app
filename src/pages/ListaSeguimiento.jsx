import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSeguidores, getSeguidos, getAmigos } from '../lib/api'
import PersonaChip from '../components/PersonaChip'
import BackButton from '../components/BackButton'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const CONFIG_POR_TIPO = {
  seguidores: {
    titulo: 'Seguidores',
    vacio: 'Todavía no tiene seguidores',
    cargar: getSeguidores,
  },
  siguiendo: {
    titulo: 'Siguiendo',
    vacio: 'Todavía no sigue a nadie',
    cargar: getSeguidos,
  },
  amigos: {
    titulo: 'Amigos',
    vacio: 'Todavía no tiene amigos',
    cargar: getAmigos,
  },
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
      <div className="app-screen">
        <BackButton />
        <p className="inicio-vacio">Esta página no existe.</p>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <BackButton />

      <header className="screen-header">
        <span className="screen-title">{config.titulo}</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando...</p>
      ) : personas.length === 0 ? (
        <p className="inicio-vacio">{config.vacio}</p>
      ) : (
        <div className="votantes-lista votantes-lista--columna">
          {personas.map((persona) => (
            <PersonaChip key={persona.id} perfil={persona} />
          ))}
        </div>
      )}
    </div>
  )
}

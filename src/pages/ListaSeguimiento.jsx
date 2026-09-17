import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAmigos, getFeedSocialHoy } from '../lib/api'
import { getFechaNocturnaActual } from '../lib/dates'
import PersonaChip from '../components/PersonaChip'
import { SkeletonPersonaFila } from '../components/Skeleton'
import BackButton from '../components/BackButton'
import { useAuth } from '../context/AuthContext'
import { compartirPerfil } from '../lib/compartir'
import EmptyState from '../components/EmptyState'
import IconoAmigos from '../components/IconoAmigos'
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
  const { user, signOut } = useAuth()
  const config = CONFIG_POR_TIPO[tipo]
  const esMiPropiaLista = user?.id === id

  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // "Dónde va hoy" por persona: reutiliza getFeedSocialHoy, la misma
  // función que ya usa Social.jsx para "Tus amigos hoy" — sin ninguna
  // consulta nueva. Independiente del fetch de la lista, así un fallo aquí
  // nunca bloquea ver la lista en sí.
  const [dondeVaHoyPorId, setDondeVaHoyPorId] = useState({})
  useEffect(() => {
    let activo = true
    getFeedSocialHoy(getFechaNocturnaActual()).then(({ data }) => {
      if (!activo) return
      const mapa = {}
      for (const item of data ?? []) {
        mapa[item.usuario_id] = item.local_nombre
      }
      setDondeVaHoyPorId(mapa)
    })
    return () => {
      activo = false
    }
  }, [])

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
          <EmptyState
            icono={<IconoAmigos size={20} />}
            titulo={config.vacio}
            texto={esMiPropiaLista ? 'Invita a tus amigos para verlos aquí.' : undefined}
            accion={
              esMiPropiaLista ? { texto: 'Invitar amigos', onClick: () => compartirPerfil(user.id) } : undefined
            }
          />
        ) : (
          <div className="votantes-lista votantes-lista--columna">
            {personas.map((persona) => (
              <div key={persona.id} className="amigos-v2-fila">
                <PersonaChip
                  perfil={persona}
                  subtitulo={dondeVaHoyPorId[persona.id] ? `Hoy va a ${dondeVaHoyPorId[persona.id]}` : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

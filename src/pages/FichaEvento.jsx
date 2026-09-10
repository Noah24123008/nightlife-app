import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEventoPorId, getVotosDelDia, votarPorLocal, getPersonasQueVanHoy } from '../lib/api'
import { toISODate, formatearFechaLarga } from '../lib/dates'
import VotoButton from '../components/VotoButton'
import PersonaChip from '../components/PersonaChip'
import ImagenConFallback from '../components/ImagenConFallback'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const LIMITE_PERSONAS_VISIBLES = 8

export default function FichaEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const hoyISO = useMemo(() => toISODate(new Date()), [])

  const [evento, setEvento] = useState(null)
  const [votosHoy, setVotosHoy] = useState([])
  const [personas, setPersonas] = useState([])
  const [cargandoPersonas, setCargandoPersonas] = useState(false)
  const [mostrarTodasPersonas, setMostrarTodasPersonas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const [
        { data: eventoData, error: errEvento },
        { data: votosData, error: errVotos },
      ] = await Promise.all([getEventoPorId(id), getVotosDelDia(hoyISO)])

      if (!activo) return

      if (errEvento || !eventoData) {
        setError(mensajeError(errEvento, 'No se pudo cargar este evento.'))
        setCargando(false)
        if (esErrorDeAutenticacion(errEvento)) setTimeout(() => signOut(), 2000)
        return
      }
      setEvento(eventoData)
      setVotosHoy(errVotos ? [] : votosData ?? [])
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [id, hoyISO])

  const miVotoHoyLocalId = useMemo(
    () => votosHoy.find((v) => v.usuario_id === user?.id)?.local_id ?? null,
    [votosHoy, user]
  )

  useEffect(() => {
    let activo = true
    async function cargarPersonas() {
      setCargandoPersonas(true)
      const { data, error: errPersonas } = await getPersonasQueVanHoy({ eventoId: id })
      if (!activo) return
      setPersonas(errPersonas ? [] : data ?? [])
      setCargandoPersonas(false)
    }
    cargarPersonas()
    return () => {
      activo = false
    }
  }, [id, votosHoy])

  async function handleVotar() {
    if (!user || !evento?.locales) return
    setVotando(true)
    setError('')
    const { error: errVoto } = await votarPorLocal({
      usuarioId: user.id,
      localId: evento.locales.id,
      fecha: hoyISO,
      eventoId: evento.id,
    })
    if (errVoto) {
      setError(mensajeError(errVoto, 'No se pudo registrar tu voto. Inténtalo de nuevo.'))
      if (esErrorDeAutenticacion(errVoto)) setTimeout(() => signOut(), 2000)
    } else {
      const { data } = await getVotosDelDia(hoyISO)
      setVotosHoy(data ?? [])
    }
    setVotando(false)
  }

  if (cargando) {
    return (
      <div className="app-screen">
        <p className="app-loading">Cargando evento...</p>
      </div>
    )
  }

  if (!evento || !evento.locales) {
    return (
      <div className="app-screen">
        <button type="button" className="ficha-volver" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        {error && <p className="auth-error">{error}</p>}
        <p className="inicio-vacio">No hemos encontrado este evento.</p>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <button type="button" className="ficha-volver" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <ImagenConFallback
        src={evento.foto_url}
        alt={evento.nombre}
        className="ficha-foto"
        placeholderClassName="ficha-foto ficha-foto--vacia"
      />

      <h1 className="venue-name ficha-nombre">{evento.nombre}</h1>
      <p className="local-categoria">
        {formatearFechaLarga(evento.fecha)}
        {evento.hora_inicio ? ` · ${evento.hora_inicio.slice(0, 5)}` : ''}
        {evento.hora_fin ? ` - ${evento.hora_fin.slice(0, 5)}` : ''}
      </p>

      {error && <p className="auth-error">{error}</p>}

      {evento.descripcion && <p className="ficha-descripcion">{evento.descripcion}</p>}

      <div className="ficha-datos">
        <p>
          <strong>Local: </strong>
          <Link to={`/locales/${evento.locales.id}`}>{evento.locales.nombre}</Link>
        </p>
        {evento.locales.direccion && (
          <p>
            <strong>Dirección: </strong>
            {evento.locales.direccion}
          </p>
        )}
      </div>

      <div className="ficha-voto">
        <p className="ficha-votos-hoy">Vota por este evento</p>
        <VotoButton
          votado={miVotoHoyLocalId === evento.locales.id}
          cargando={votando}
          onClick={handleVotar}
        />
      </div>

      <div className="ficha-votantes">
        <h2 className="ficha-subtitulo">Quién va a este evento</h2>
        {cargandoPersonas ? (
          <p className="app-loading">Cargando...</p>
        ) : personas.length === 0 ? (
          <p className="inicio-vacio">Todavía nadie ha indicado que va a este evento.</p>
        ) : (
          <>
            <div className="votantes-lista">
              {(mostrarTodasPersonas ? personas : personas.slice(0, LIMITE_PERSONAS_VISIBLES)).map((perfil) => (
                <PersonaChip key={perfil.id} perfil={perfil} mostrarSigues />
              ))}
            </div>
            {!mostrarTodasPersonas && personas.length > LIMITE_PERSONAS_VISIBLES && (
              <button
                type="button"
                className="votantes-ver-todos"
                onClick={() => setMostrarTodasPersonas(true)}
              >
                +{personas.length - LIMITE_PERSONAS_VISIBLES} más
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

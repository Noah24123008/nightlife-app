import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEventoPorId, getVotosDelDia, votarPorLocal, eliminarVoto, getPersonasQueVanHoy } from '../lib/api'
import { formatearFechaLarga } from '../lib/dates'
import { useEffect, useMemo, useState } from 'react'
import VotoButton from '../components/VotoButton'
import PersonaChip from '../components/PersonaChip'
import FotoLocalPanoramica from '../components/FotoLocalPanoramica'
import BackButton from '../components/BackButton'
import { SkeletonFicha, SkeletonPersonaFila } from '../components/Skeleton'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const LIMITE_PERSONAS_VISIBLES = 8

export default function FichaEvento() {
  const { id } = useParams()
  const { user, signOut } = useAuth()

  const [evento, setEvento] = useState(null)
  const [votosDelDia, setVotosDelDia] = useState([])
  const [personas, setPersonas] = useState([])
  const [cargandoPersonas, setCargandoPersonas] = useState(false)
  const [mostrarTodasPersonas, setMostrarTodasPersonas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState('')

  // Primero se carga el evento; solo con su fecha real sabemos qué día de
  // votos consultar (nunca "hoy" fijo, para no mezclar votos de otras fechas).
  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')

      const { data: eventoData, error: errEvento } = await getEventoPorId(id)
      if (!activo) return

      if (errEvento || !eventoData) {
        setError(mensajeError(errEvento, 'No se pudo cargar este evento.'))
        setCargando(false)
        if (esErrorDeAutenticacion(errEvento)) setTimeout(() => signOut(), 2000)
        return
      }
      setEvento(eventoData)

      const { data: votosData, error: errVotos } = await getVotosDelDia(eventoData.fecha)
      if (!activo) return
      setVotosDelDia(errVotos ? [] : votosData ?? [])
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [id])

  // El voto del usuario para la fecha del evento (si existe)
  const miVoto = useMemo(
    () => votosDelDia.find((v) => v.usuario_id === user?.id),
    [votosDelDia, user]
  )

  // "Voy a este evento" exige que el voto apunte específicamente a este
  // evento, no solo a su local: alguien puede ir al local por otro evento,
  // o sin evento, y eso no cuenta como ir a este evento en concreto.
  const voyAEsteEvento = miVoto?.evento_id === evento?.id

  useEffect(() => {
    if (!evento) return
    let activo = true
    async function cargarPersonas() {
      setCargandoPersonas(true)
      const { data, error: errPersonas } = await getPersonasQueVanHoy({
        eventoId: id,
        fecha: evento.fecha,
      })
      if (!activo) return
      setPersonas(errPersonas ? [] : data ?? [])
      setCargandoPersonas(false)
    }
    cargarPersonas()
    return () => {
      activo = false
    }
  }, [id, evento?.fecha, votosDelDia])

  async function handleVotar() {
    if (!user || !evento?.locales) return

    const votosPrevios = votosDelDia
    const otrosVotos = votosDelDia.filter((v) => v.usuario_id !== user.id)
    const votosOptimistas = voyAEsteEvento
      ? otrosVotos
      : [
          ...otrosVotos,
          { usuario_id: user.id, local_id: evento.locales.id, fecha: evento.fecha, evento_id: evento.id },
        ]

    setVotosDelDia(votosOptimistas)
    setVotando(true)
    setError('')

    const { error: errVoto } = voyAEsteEvento
      ? await eliminarVoto({ usuarioId: user.id, fecha: evento.fecha })
      : await votarPorLocal({
          usuarioId: user.id,
          localId: evento.locales.id,
          fecha: evento.fecha,
          eventoId: evento.id,
        })

    if (errVoto) {
      setVotosDelDia(votosPrevios)
      const mensajePorDefecto = voyAEsteEvento
        ? 'No se pudo quitar tu voto. Inténtalo de nuevo.'
        : 'No se pudo registrar tu voto. Inténtalo de nuevo.'
      setError(mensajeError(errVoto, mensajePorDefecto))
      if (esErrorDeAutenticacion(errVoto)) setTimeout(() => signOut(), 2000)
    }
    setVotando(false)
  }

  if (cargando) {
    return (
      <div className="app-screen ficha-evento-v2">
        <div className="ficha-evento-v2-hero">
          <div className="ficha-evento-v2-hero-back">
            <BackButton />
          </div>
          <SkeletonFicha />
        </div>
      </div>
    )
  }

  if (!evento || !evento.locales) {
    return (
      <div className="app-screen ficha-evento-v2">
        <div className="ficha-evento-v2-contenido">
          <BackButton />
          {error && <p className="auth-error">{error}</p>}
          <p className="inicio-vacio">No hemos encontrado este evento.</p>
        </div>
      </div>
    )
  }

  const tieneHorario = Boolean(evento.hora_inicio || evento.hora_fin)

  return (
    <div className="app-screen ficha-evento-v2">
      <div className="ficha-evento-v2-hero">
        <FotoLocalPanoramica src={evento.foto_url || evento.locales.foto_url} alt={evento.nombre} />
        <div className="ficha-evento-v2-hero-back">
          <BackButton />
        </div>
      </div>

      <div className="ficha-evento-v2-contenido">
        <span className="ficha-evento-v2-fecha-chip">{formatearFechaLarga(evento.fecha)}</span>

        <h1 className="venue-name ficha-nombre">{evento.nombre}</h1>

        <Link to={`/locales/${evento.locales.id}`} className="ficha-evento-v2-local">
          📍 {evento.locales.nombre}
        </Link>
        {evento.locales.direccion && <p className="ficha-evento-v2-direccion">{evento.locales.direccion}</p>}

        {error && <p className="auth-error">{error}</p>}

        <div className="ficha-voto">
          <p className="ficha-votos-hoy">Vota por este evento</p>
          <VotoButton votado={voyAEsteEvento} cargando={votando} onClick={handleVotar} />
        </div>

        {tieneHorario && (
          <div className="ficha-evento-v2-info-fila">
            <div className="ficha-evento-v2-info-card">
              <span className="ficha-evento-v2-info-icono" aria-hidden="true">
                🕐
              </span>
              <div>
                <p className="ficha-evento-v2-info-titulo">Horario</p>
                <p className="ficha-evento-v2-info-valor">
                  {evento.hora_inicio?.slice(0, 5)}
                  {evento.hora_fin ? ` - ${evento.hora_fin.slice(0, 5)}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {evento.descripcion && <p className="ficha-descripcion">{evento.descripcion}</p>}

        <div className="ficha-votantes">
          <h2 className="ficha-subtitulo">Quién va a este evento</h2>
          {cargandoPersonas ? (
            <div className="votantes-lista">
              <SkeletonPersonaFila />
              <SkeletonPersonaFila />
              <SkeletonPersonaFila />
            </div>
          ) : personas.length === 0 ? (
            <p className="inicio-vacio">Todavía nadie ha indicado que va a este evento.</p>
          ) : (
            <>
              <div className="votantes-lista">
                {(mostrarTodasPersonas ? personas : personas.slice(0, LIMITE_PERSONAS_VISIBLES)).map((perfil) => (
                  <PersonaChip key={perfil.id} perfil={perfil} />
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
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getLocalPorId, getVotosDelDia, getEventosDeLocal, votarPorLocal, getPersonasQueVanHoy } from '../lib/api'
import { toISODate, formatearFechaLarga } from '../lib/dates'
import VotoButton from '../components/VotoButton'
import PersonaChip from '../components/PersonaChip'
import ImagenConFallback from '../components/ImagenConFallback'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const LIMITE_VOTANTES_VISIBLES = 8

export default function FichaLocal() {
  const { id } = useParams()
  const { user, signOut } = useAuth()

  const hoyISO = useMemo(() => toISODate(new Date()), [])

  const [local, setLocal] = useState(null)
  const [votosHoy, setVotosHoy] = useState([])
  const [eventos, setEventos] = useState([])
  const [votantes, setVotantes] = useState([])
  const [cargandoVotantes, setCargandoVotantes] = useState(false)
  const [mostrarTodosVotantes, setMostrarTodosVotantes] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const [
        { data: localData, error: errLocal },
        { data: votosData, error: errVotos },
        { data: eventosData, error: errEventos },
      ] = await Promise.all([getLocalPorId(id), getVotosDelDia(hoyISO), getEventosDeLocal(id, hoyISO)])

      if (!activo) return

      if (errLocal || !localData) {
        setError(mensajeError(errLocal, 'No se pudo cargar este local.'))
        setCargando(false)
        if (esErrorDeAutenticacion(errLocal)) setTimeout(() => signOut(), 2000)
        return
      }
      setLocal(localData)
      setVotosHoy(errVotos ? [] : votosData ?? [])
      setEventos(errEventos ? [] : eventosData ?? [])
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [id, hoyISO])

  const votosDeEsteLocal = useMemo(
    () => votosHoy.filter((v) => v.local_id === id).length,
    [votosHoy, id]
  )

  const idsVotantesEsteLocal = useMemo(
    () => votosHoy.filter((v) => v.local_id === id).map((v) => v.usuario_id),
    [votosHoy, id]
  )

  useEffect(() => {
    if (idsVotantesEsteLocal.length === 0) {
      setVotantes([])
      return
    }
    let activo = true
    async function cargarVotantes() {
      setCargandoVotantes(true)
      const { data, error: errPerfiles } = await getPersonasQueVanHoy({ localId: id })
      if (!activo) return
      setVotantes(errPerfiles ? [] : data ?? [])
      setCargandoVotantes(false)
    }
    cargarVotantes()
    return () => {
      activo = false
    }
  }, [idsVotantesEsteLocal, id])

  const miVotoHoyLocalId = useMemo(
    () => votosHoy.find((v) => v.usuario_id === user?.id)?.local_id ?? null,
    [votosHoy, user]
  )

  async function handleVotar() {
    if (!user || !local) return
    setVotando(true)
    setError('')
    const { error: errVoto } = await votarPorLocal({ usuarioId: user.id, localId: local.id, fecha: hoyISO })
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
        <p className="app-loading">Cargando local...</p>
      </div>
    )
  }

  if (!local) {
    return (
      <div className="app-screen">
        <Link to="/locales" className="ficha-volver">
          ← Locales
        </Link>
        {error && <p className="auth-error">{error}</p>}
        <p className="inicio-vacio">No hemos encontrado este local.</p>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <Link to="/locales" className="ficha-volver">
        ← Locales
      </Link>

      <ImagenConFallback
        src={local.foto_url}
        alt={local.nombre}
        className="ficha-foto"
        placeholderClassName="ficha-foto ficha-foto--vacia"
      />

      <h1 className="venue-name ficha-nombre">{local.nombre}</h1>
      <p className="local-categoria">{local.categoria}</p>

      {error && <p className="auth-error">{error}</p>}

      <div className="ficha-datos">
        {local.direccion && (
          <p>
            <strong>Dirección: </strong>
            {local.direccion}
          </p>
        )}
        {local.horario && (
          <p>
            <strong>Horario: </strong>
            {local.horario}
          </p>
        )}
        {local.descripcion && <p className="ficha-descripcion">{local.descripcion}</p>}
      </div>

      <div className="ficha-voto">
        <p className="ficha-votos-hoy">
          {votosDeEsteLocal} {votosDeEsteLocal === 1 ? 'persona va' : 'personas van'} hoy
        </p>
        <VotoButton votado={miVotoHoyLocalId === local.id} cargando={votando} onClick={handleVotar} />
      </div>

      <div className="ficha-votantes">
        <h2 className="ficha-subtitulo">Quién va hoy</h2>
        {cargandoVotantes ? (
          <p className="app-loading">Cargando...</p>
        ) : votantes.length === 0 ? (
          <p className="inicio-vacio">Todavía nadie ha indicado que va hoy.</p>
        ) : (
          <>
            <div className="votantes-lista">
              {(mostrarTodosVotantes ? votantes : votantes.slice(0, LIMITE_VOTANTES_VISIBLES)).map((perfil) => (
                <PersonaChip key={perfil.id} perfil={perfil} mostrarSigues />
              ))}
            </div>
            {!mostrarTodosVotantes && votantes.length > LIMITE_VOTANTES_VISIBLES && (
              <button
                type="button"
                className="votantes-ver-todos"
                onClick={() => setMostrarTodosVotantes(true)}
              >
                +{votantes.length - LIMITE_VOTANTES_VISIBLES} más
              </button>
            )}
          </>
        )}
      </div>

      <h2 className="ficha-subtitulo">Próximos eventos</h2>
      {eventos.length === 0 ? (
        <p className="inicio-vacio">Este local no tiene eventos programados todavía.</p>
      ) : (
        <ul className="eventos-lista">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link to={`/eventos/${evento.id}`} className="evento-item">
                <span className="evento-hora">{evento.hora_inicio?.slice(0, 5)}</span>
                <div>
                  <p className="evento-nombre">{evento.nombre}</p>
                  <p className="evento-local">{formatearFechaLarga(evento.fecha)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

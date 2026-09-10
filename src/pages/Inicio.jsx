import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCiudadPorNombre, getLocalesPorCiudad, getVotosDelDia, getEventosDelDia, votarPorLocal, getFeedSocialHoy, getNumeroNotificacionesNoLeidas, getRecomendacionesSocialesHoy } from '../lib/api'
import { buildDiasVisibles } from '../lib/dates'
import DaySelector from '../components/DaySelector'
import VotoButton from '../components/VotoButton'
import ActividadCard from '../components/ActividadCard'
import RecomendacionSocialCard from '../components/RecomendacionSocialCard'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const CIUDAD_ACTUAL = 'Gijón'
const DIAS_VISIBLES = 5
const LIMITE_RANKING_INICIAL = 5
const LIMITE_RECOMENDACIONES_INICIAL = 3
const LIMITE_FEED_INICIAL = 4

export default function Inicio() {
  const { user, signOut } = useAuth()

  const dias = useMemo(() => buildDiasVisibles(new Date(), DIAS_VISIBLES), [])
  const [indiceDia, setIndiceDia] = useState(0)
  const diaSeleccionado = dias[indiceDia]
  const esHoy = indiceDia === 0

  const [ciudadId, setCiudadId] = useState(null)
  const [locales, setLocales] = useState([])
  const [votosHoy, setVotosHoy] = useState([])
  const [eventosDia, setEventosDia] = useState([])

  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoDia, setCargandoDia] = useState(true)
  const [votandoLocalId, setVotandoLocalId] = useState(null)
  const [error, setError] = useState('')

  const [feed, setFeed] = useState([])
  const [cargandoFeed, setCargandoFeed] = useState(true)
  const [errorFeed, setErrorFeed] = useState('')

  const [recomendaciones, setRecomendaciones] = useState([])
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(true)

  const [numNoLeidas, setNumNoLeidas] = useState(0)

  const [mostrarRankingCompleto, setMostrarRankingCompleto] = useState(false)
  const [mostrarTodasRecomendaciones, setMostrarTodasRecomendaciones] = useState(false)
  const [mostrarTodoFeed, setMostrarTodoFeed] = useState(false)

  // Cargar la ciudad y sus locales una sola vez
  useEffect(() => {
    let activo = true
    async function cargarBase() {
      setCargandoBase(true)
      const { data: ciudad, error: errCiudad } = await getCiudadPorNombre(CIUDAD_ACTUAL)
      if (!activo) return
      if (errCiudad || !ciudad) {
        setError(mensajeError(errCiudad, 'No se pudo cargar la ciudad de Gijón desde Supabase.'))
        setCargandoBase(false)
        if (esErrorDeAutenticacion(errCiudad)) setTimeout(() => signOut(), 2000)
        return
      }
      setCiudadId(ciudad.id)
      const { data: localesData, error: errLocales } = await getLocalesPorCiudad(ciudad.id)
      if (!activo) return
      if (errLocales) {
        setError(mensajeError(errLocales, 'No se pudieron cargar los locales.'))
        if (esErrorDeAutenticacion(errLocales)) setTimeout(() => signOut(), 2000)
      } else {
        setLocales(localesData ?? [])
      }
      setCargandoBase(false)
    }
    cargarBase()
    return () => {
      activo = false
    }
  }, [])

  // Cargar votos (Hoy) o eventos (días futuros) según el día seleccionado
  useEffect(() => {
    if (!ciudadId) return
    let activo = true
    async function cargarDia() {
      setCargandoDia(true)
      setError('')
      if (esHoy) {
        const { data, error: errVotos } = await getVotosDelDia(diaSeleccionado.fechaISO)
        if (!activo) return
        if (errVotos) {
          setError(mensajeError(errVotos, 'No se pudo cargar el ranking de hoy.'))
          if (esErrorDeAutenticacion(errVotos)) setTimeout(() => signOut(), 2000)
        } else {
          setVotosHoy(data ?? [])
        }
      } else {
        const { data, error: errEventos } = await getEventosDelDia(ciudadId, diaSeleccionado.fechaISO)
        if (!activo) return
        if (errEventos) {
          setError(mensajeError(errEventos, 'No se pudieron cargar los eventos de este día.'))
          if (esErrorDeAutenticacion(errEventos)) setTimeout(() => signOut(), 2000)
        } else {
          setEventosDia(data ?? [])
        }
      }
      setCargandoDia(false)
    }
    cargarDia()
    return () => {
      activo = false
    }
  }, [ciudadId, diaSeleccionado.fechaISO, esHoy])

  // Feed social: no depende del día seleccionado, siempre es de hoy
  useEffect(() => {
    let activo = true
    async function cargarFeed() {
      setCargandoFeed(true)
      const { data, error: errFeed } = await getFeedSocialHoy()
      if (!activo) return
      if (errFeed) {
        setErrorFeed(mensajeError(errFeed, 'No se pudo cargar la actividad de la gente que sigues.'))
        if (esErrorDeAutenticacion(errFeed)) setTimeout(() => signOut(), 2000)
      } else {
        setFeed(data ?? [])
      }
      setCargandoFeed(false)
    }
    cargarFeed()
    return () => {
      activo = false
    }
  }, [])

  // Recomendaciones sociales: tampoco dependen del día seleccionado
  useEffect(() => {
    let activo = true
    async function cargarRecomendaciones() {
      setCargandoRecomendaciones(true)
      const { data } = await getRecomendacionesSocialesHoy()
      if (!activo) return
      setRecomendaciones(data ?? [])
      setCargandoRecomendaciones(false)
    }
    cargarRecomendaciones()
    return () => {
      activo = false
    }
  }, [])

  // Contador de notificaciones no leídas para la campana de la cabecera
  useEffect(() => {
    let activo = true
    async function cargarContador() {
      const { count } = await getNumeroNotificacionesNoLeidas()
      if (!activo) return
      setNumNoLeidas(count ?? 0)
    }
    cargarContador()
    return () => {
      activo = false
    }
  }, [])

  const miVotoHoyLocalId = useMemo(
    () => votosHoy.find((v) => v.usuario_id === user?.id)?.local_id ?? null,
    [votosHoy, user]
  )

  const ranking = useMemo(() => {
    const conteos = new Map()
    for (const v of votosHoy) {
      conteos.set(v.local_id, (conteos.get(v.local_id) ?? 0) + 1)
    }
    return locales
      .map((local) => ({ ...local, votos: conteos.get(local.id) ?? 0 }))
      .sort((a, b) => b.votos - a.votos)
  }, [locales, votosHoy])

  const destinoTemporal = useMemo(
    () => locales.find((local) => local.nombre === 'Fiestas de Cimadevilla'),
    [locales]
  )

  async function handleVotar(localId) {
    if (!user) return
    setVotandoLocalId(localId)
    setError('')
    const { error: errVoto } = await votarPorLocal({
      usuarioId: user.id,
      localId,
      fecha: diaSeleccionado.fechaISO,
    })
    if (errVoto) {
      setError(mensajeError(errVoto, 'No se pudo registrar tu voto. Inténtalo de nuevo.'))
      if (esErrorDeAutenticacion(errVoto)) setTimeout(() => signOut(), 2000)
    } else {
      const { data } = await getVotosDelDia(diaSeleccionado.fechaISO)
      setVotosHoy(data ?? [])
    }
    setVotandoLocalId(null)
  }

  return (
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Gijón</span>
        <div className="header-iconos">
          <Link to="/notificaciones" className="header-icono-campana" aria-label="Notificaciones">
            🔔
            {numNoLeidas > 0 && (
              <span className="badge-no-leidas">{numNoLeidas > 9 ? '9+' : numNoLeidas}</span>
            )}
          </Link>
          <Link to="/buscar" className="header-icono-buscar" aria-label="Buscar personas">
            🔍
          </Link>
        </div>
      </header>

      <Link to="/hoy" className="banner-donde-va">
        <span>🔥 Dónde va la gente hoy</span>
        <span className="banner-flecha">→</span>
      </Link>

      {destinoTemporal && (
        <Link to={`/locales/${destinoTemporal.id}`} className="banner-temporal">
          <div className="banner-temporal-cabecera">
            <span className="badge-temporal">TEMPORAL</span>
            <span className="banner-temporal-zona">Cimavilla</span>
          </div>
          <p className="banner-temporal-titulo">✨ {destinoTemporal.nombre}</p>
          <p className="banner-temporal-subtitulo">Carpa especial este fin de semana</p>
          <span className="banner-temporal-enlace">Ver ficha →</span>
        </Link>
      )}

      <DaySelector dias={dias} indiceSeleccionado={indiceDia} onSeleccionar={setIndiceDia} />

      {error && <p className="auth-error">{error}</p>}

      {esHoy ? (
        cargandoBase || cargandoDia ? (
          <p className="app-loading">Cargando ranking...</p>
        ) : (
          <>
            {votosHoy.length === 0 && (
              <p className="inicio-vacio">Todavía no hay votos hoy. ¡Sé el primero en decir a dónde vas!</p>
            )}
            <ul className="ranking">
              {(mostrarRankingCompleto ? ranking : ranking.slice(0, LIMITE_RANKING_INICIAL)).map((local, index) => (
                <li
                  key={local.id}
                  className={`local-item ${index === 0 ? 'local-item--destacado' : ''} ${
                    miVotoHoyLocalId === local.id ? 'local-item--votado' : ''
                  }`}
                >
                  <span className="rank-position">{index + 1}</span>
                  <div className="local-info">
                    <p className="venue-name">{local.nombre}</p>
                    <p className="local-categoria">
                      {local.categoria} · {local.votos} {local.votos === 1 ? 'persona va' : 'personas van'}
                    </p>
                  </div>
                  <VotoButton
                    votado={miVotoHoyLocalId === local.id}
                    cargando={votandoLocalId === local.id}
                    onClick={() => handleVotar(local.id)}
                  />
                </li>
              ))}
            </ul>
            {!mostrarRankingCompleto && ranking.length > LIMITE_RANKING_INICIAL && (
              <button
                type="button"
                className="inicio-ver-mas"
                onClick={() => setMostrarRankingCompleto(true)}
              >
                Ver todos los locales
              </button>
            )}
          </>
        )
      ) : cargandoDia ? (
        <p className="app-loading">Cargando eventos...</p>
      ) : eventosDia.length === 0 ? (
        <p className="inicio-vacio">No hay eventos programados para este día todavía.</p>
      ) : (
        <ul className="eventos-lista">
          {eventosDia.map((evento) => (
            <li key={evento.id}>
              <Link to={`/eventos/${evento.id}`} className="evento-item">
                <span className="evento-hora">{evento.hora_inicio?.slice(0, 5)}</span>
                <div>
                  <p className="evento-nombre">{evento.nombre}</p>
                  <p className="evento-local">{evento.locales?.nombre}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {esHoy && (
        <div className="recomendaciones-social">
          <h2 className="ficha-subtitulo">Te puede interesar hoy</h2>
          {cargandoRecomendaciones ? (
            <p className="app-loading">Cargando recomendaciones...</p>
          ) : recomendaciones.length === 0 ? (
            <p className="inicio-vacio">Sigue a más gente para descubrir dónde van hoy</p>
          ) : (
            <>
              <div className="recomendaciones-lista">
                {(mostrarTodasRecomendaciones
                  ? recomendaciones
                  : recomendaciones.slice(0, LIMITE_RECOMENDACIONES_INICIAL)
                ).map((r) => (
                  <RecomendacionSocialCard key={r.local_id} recomendacion={r} />
                ))}
              </div>
              {!mostrarTodasRecomendaciones && recomendaciones.length > LIMITE_RECOMENDACIONES_INICIAL && (
                <button
                  type="button"
                  className="inicio-ver-mas"
                  onClick={() => setMostrarTodasRecomendaciones(true)}
                >
                  Ver más recomendaciones
                </button>
              )}
            </>
          )}
        </div>
      )}

      {esHoy && (
        <div className="feed-social">
          <h2 className="ficha-subtitulo">Actividad de la gente que sigues</h2>
          {cargandoFeed ? (
            <p className="app-loading">Cargando actividad...</p>
          ) : errorFeed ? (
            <p className="auth-error">{errorFeed}</p>
          ) : feed.length === 0 ? (
            <p className="inicio-vacio">La gente que sigues todavía no ha indicado dónde va hoy</p>
          ) : (
            <>
              <div className="feed-lista">
                {(mostrarTodoFeed ? feed : feed.slice(0, LIMITE_FEED_INICIAL)).map((actividad) => (
                  <ActividadCard key={actividad.usuario_id} actividad={actividad} />
                ))}
              </div>
              {!mostrarTodoFeed && feed.length > LIMITE_FEED_INICIAL && (
                <button type="button" className="inicio-ver-mas" onClick={() => setMostrarTodoFeed(true)}>
                  Ver más actividad
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

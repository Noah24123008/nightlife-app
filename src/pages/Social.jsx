import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSolicitudesPendientesRecibidas, responderSolicitudAmistad, getFeedSocialHoy, getAmigos } from '../lib/api'
import { buildDiasVisibles, etiquetaDiaTexto } from '../lib/dates'
import DaySelector from '../components/DaySelector'
import PersonaChip from '../components/PersonaChip'
import ImagenConFallback from '../components/ImagenConFallback'
import ActividadCard from '../components/ActividadCard'
import InvitarAmigosCard from '../components/InvitarAmigosCard'
import { SkeletonPersonaFila } from '../components/Skeleton'
import { compartirPerfil } from '../lib/compartir'
import { iniciales } from '../lib/iniciales'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const DIAS_VISIBLES = 8
const LIMITE_FEED_INICIAL = 4

// "Pedro" / "Pedro y Lucía" / "Pedro, Lucía y 3 más"
function textoNombres(personas) {
  const nombres = personas.map((p) => p.nombre || p.nombre_usuario || 'Alguien')
  if (nombres.length === 1) return nombres[0]
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`
  return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`
}

export default function Social() {
  const { user, signOut, refrescarSolicitudesPendientes } = useAuth()

  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

  // Solo para decidir si mostrar el bloque grande de "invita a tus amigos"
  // cuando el usuario todavía no tiene ninguno. Reutiliza getAmigos, ya
  // existente (la misma función que usa Perfil.jsx).
  const [numAmigos, setNumAmigos] = useState(null)
  useEffect(() => {
    let activo = true
    getAmigos(user.id).then(({ data }) => {
      if (activo) setNumAmigos((data ?? []).length)
    })
    return () => {
      activo = false
    }
  }, [user.id])

  // Selector de día propio de esta pantalla: controla únicamente el bloque
  // de actividad de amigos de aquí abajo, nada más de Social.
  const dias = useMemo(() => buildDiasVisibles(new Date(), DIAS_VISIBLES), [])
  const [indiceDia, setIndiceDia] = useState(0)
  const diaSeleccionado = dias[indiceDia]
  const etiquetaTexto = useMemo(
    () => etiquetaDiaTexto(diaSeleccionado.fecha, indiceDia),
    [diaSeleccionado.fecha, indiceDia]
  )

  const [feed, setFeed] = useState([])
  const [cargandoFeed, setCargandoFeed] = useState(true)
  const [errorFeed, setErrorFeed] = useState('')
  const [mostrarTodoFeed, setMostrarTodoFeed] = useState(false)

  // "Tus amigos hoy": siempre el día de hoy, independiente del selector de
  // "Actividad" de más abajo. dias[0] ya es hoy (buildDiasVisibles sin
  // fecha ancla empieza en hoy), así que no hace falta ni importar
  // toISODate aparte. Reutiliza getFeedSocialHoy, la misma función que ya
  // usa "Actividad de tus amigos" — sin ninguna consulta nueva.
  const hoyISO = dias[0].fechaISO
  const [feedHoy, setFeedHoy] = useState([])
  const [cargandoFeedHoy, setCargandoFeedHoy] = useState(true)

  useEffect(() => {
    let activo = true
    getFeedSocialHoy(hoyISO).then(({ data }) => {
      if (activo) setFeedHoy(data ?? [])
      if (activo) setCargandoFeedHoy(false)
    })
    return () => {
      activo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoyISO])

  // Agrupado por local en el cliente — mismo dato de feedHoy, sin tocar la
  // privacidad ni el filtrado de amigos, que ya viene resuelto por la RPC.
  const gruposPorLocal = useMemo(() => {
    const grupos = new Map()
    for (const item of feedHoy) {
      if (!grupos.has(item.local_id)) {
        grupos.set(item.local_id, { local_id: item.local_id, local_nombre: item.local_nombre, personas: [] })
      }
      grupos.get(item.local_id).personas.push(item)
    }
    return Array.from(grupos.values()).sort((a, b) => b.personas.length - a.personas.length)
  }, [feedHoy])

  // "Sin decidir" = amigos totales menos los que ya aparecen en el feed de
  // hoy (por diferencia, sin ninguna consulta adicional).
  const amigosSinDecidir = useMemo(() => {
    if (numAmigos === null) return 0
    const idsQueYaVan = new Set(feedHoy.map((item) => item.usuario_id))
    return Math.max(0, numAmigos - idsQueYaVan.size)
  }, [numAmigos, feedHoy])

  async function cargarSolicitudes() {
    setCargando(true)
    setError('')
    const { data, error: err } = await getSolicitudesPendientesRecibidas(user.id)
    if (err) {
      setError(mensajeError(err, 'No se pudieron cargar las solicitudes.'))
      if (esErrorDeAutenticacion(err)) setTimeout(() => signOut(), 2000)
    } else {
      setSolicitudes(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarSolicitudes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actividad de amigos del día seleccionado en el selector de esta pantalla
  useEffect(() => {
    let activo = true
    async function cargarFeed() {
      setCargandoFeed(true)
      setErrorFeed('')
      const { data, error: errFeed } = await getFeedSocialHoy(diaSeleccionado.fechaISO)
      if (!activo) return
      if (errFeed) {
        setErrorFeed(mensajeError(errFeed, 'No se pudo cargar la actividad de tus amigos.'))
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
  }, [diaSeleccionado.fechaISO])

  // Al cambiar de día, no arrastrar el "ver más" expandido del día anterior
  useEffect(() => {
    setMostrarTodoFeed(false)
  }, [indiceDia])

  async function handleResponder(solicitudId, aceptar) {
    setProcesandoId(solicitudId)
    setError('')
    const { error: err } = await responderSolicitudAmistad(solicitudId, aceptar)
    if (err) {
      setError(mensajeError(err, 'Esa solicitud ya no estaba disponible. Se ha actualizado la lista.'))
      if (esErrorDeAutenticacion(err)) setTimeout(() => signOut(), 2000)
    }
    await cargarSolicitudes()
    await refrescarSolicitudesPendientes(user.id)
    setProcesandoId(null)
  }

  return (
    <div className="app-screen social-v2">
      <div className="social-v2-contenido">
        <h1 className="social-v2-titulo">Social</h1>

        <Link to="/buscar" className="social-v2-buscador">
          <span className="social-v2-buscador-icono" aria-hidden="true">
            🔍
          </span>
          <span>Buscar personas</span>
        </Link>

        <Link to={`/usuarios/${user.id}/amigos`} className="social-v2-acceso">
          <span className="social-v2-acceso-icono" aria-hidden="true">
            👥
          </span>
          <span className="social-v2-acceso-texto">Mis amigos</span>
          <span className="social-v2-chevron" aria-hidden="true">
            ›
          </span>
        </Link>

        <InvitarAmigosCard userId={user.id} />

        {numAmigos === 0 && (
          <div className="social-v2-invitar-vacio">
            <p className="social-v2-invitar-vacio-titulo">Tu gente todavía no está aquí</p>
            <p className="social-v2-invitar-vacio-texto">
              Invita a tus amigos para ver dónde vais a salir este finde.
            </p>
            <button
              type="button"
              className="social-v2-invitar-vacio-btn"
              onClick={() => compartirPerfil(user.id)}
            >
              Invitar amigos
            </button>
          </div>
        )}

        {numAmigos !== 0 && (numAmigos > 0 || gruposPorLocal.length > 0) && (
          <>
            <h2 className="social-v2-seccion-titulo">Tus amigos hoy</h2>
            {cargandoFeedHoy ? (
              <div className="social-v2-amigos-hoy">
                <SkeletonPersonaFila />
                <SkeletonPersonaFila />
              </div>
            ) : gruposPorLocal.length === 0 ? (
              <div className="social-v2-vacio">
                <p className="inicio-vacio">Tus amigos todavía no han elegido dónde ir hoy</p>
              </div>
            ) : (
              <div className="social-v2-amigos-hoy">
                {gruposPorLocal.map((grupo) => (
                  <Link
                    key={grupo.local_id}
                    to={`/locales/${grupo.local_id}?fecha=${hoyISO}`}
                    className="social-v2-amigo-hoy-fila"
                  >
                    <div className="mini-avatares">
                      {grupo.personas.slice(0, 3).map((p) => (
                        <span key={p.usuario_id} className="mini-avatar" title={p.nombre || p.nombre_usuario}>
                          <ImagenConFallback
                            src={p.foto_url}
                            alt=""
                            placeholderClassName="mini-avatar--vacio"
                            textoAlternativo={iniciales(p)}
                          />
                        </span>
                      ))}
                    </div>
                    <p className="social-v2-amigo-hoy-texto">
                      <strong>{textoNombres(grupo.personas)}</strong> → {grupo.local_nombre}
                    </p>
                    <span className="social-v2-chevron" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                ))}
                {amigosSinDecidir > 0 && (
                  <p className="social-v2-amigos-sin-decidir">
                    {amigosSinDecidir === 1
                      ? '1 amigo todavía no ha elegido'
                      : `${amigosSinDecidir} amigos todavía no han elegido`}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <h2 className="social-v2-seccion-titulo">Solicitudes pendientes</h2>

        {error && <p className="auth-error">{error}</p>}

        {cargando ? (
          <div className="votantes-lista votantes-lista--columna">
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="social-v2-vacio">
            <span className="social-v2-vacio-icono" aria-hidden="true">
              👥
            </span>
            <p className="inicio-vacio">No tienes solicitudes de amistad pendientes</p>
          </div>
        ) : (
          <div className="social-solicitudes">
            {solicitudes.map((s) => (
              <div key={s.solicitudId} className="social-solicitud-card">
                <PersonaChip perfil={s.perfil} />
                <div className="amistad-respuesta">
                  <button
                    type="button"
                    className="glass-btn glass-btn--active"
                    onClick={() => handleResponder(s.solicitudId, true)}
                    disabled={procesandoId === s.solicitudId}
                  >
                    {procesandoId === s.solicitudId ? '...' : 'Aceptar'}
                  </button>
                  <button
                    type="button"
                    className="glass-btn"
                    onClick={() => handleResponder(s.solicitudId, false)}
                    disabled={procesandoId === s.solicitudId}
                  >
                    {procesandoId === s.solicitudId ? '...' : 'Rechazar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="social-v2-seccion-titulo">Actividad de tus amigos</h2>
        <DaySelector dias={dias} indiceSeleccionado={indiceDia} onSeleccionar={setIndiceDia} />

        {cargandoFeed ? (
          <div className="votantes-lista votantes-lista--columna">
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
          </div>
        ) : errorFeed ? (
          <p className="auth-error">{errorFeed}</p>
        ) : feed.length === 0 ? (
          <p className="inicio-vacio">Tus amigos todavía no han indicado dónde van {etiquetaTexto}</p>
        ) : (
          <>
            <div className="feed-lista">
              {(mostrarTodoFeed ? feed : feed.slice(0, LIMITE_FEED_INICIAL)).map((actividad) => (
                <ActividadCard key={actividad.usuario_id} actividad={actividad} etiquetaTexto={etiquetaTexto} />
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
    </div>
  )
}

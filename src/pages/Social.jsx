import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSolicitudesPendientesRecibidas, responderSolicitudAmistad, getFeedSocialHoy } from '../lib/api'
import { buildDiasVisibles, etiquetaDiaTexto } from '../lib/dates'
import DaySelector from '../components/DaySelector'
import PersonaChip from '../components/PersonaChip'
import ActividadCard from '../components/ActividadCard'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

const DIAS_VISIBLES = 8
const LIMITE_FEED_INICIAL = 4

export default function Social() {
  const { user, signOut } = useAuth()

  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

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
    setProcesandoId(null)
  }

  return (
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Social</span>
      </header>

      <div className="social-accesos">
        <Link to="/buscar" className="social-acceso">
          🔍 Buscar personas
        </Link>
        <Link to={`/usuarios/${user.id}/amigos`} className="social-acceso">
          👥 Mis amigos
        </Link>
      </div>

      <h2 className="ficha-subtitulo">Solicitudes pendientes</h2>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <p className="inicio-vacio">No tienes solicitudes de amistad pendientes</p>
      ) : (
        <div className="social-solicitudes">
          {solicitudes.map((s) => (
            <div key={s.solicitudId} className="social-solicitud-card">
              <PersonaChip perfil={s.perfil} />
              <div className="amistad-respuesta">
                <button
                  type="button"
                  className="amistad-aceptar"
                  onClick={() => handleResponder(s.solicitudId, true)}
                  disabled={procesandoId === s.solicitudId}
                >
                  {procesandoId === s.solicitudId ? '...' : 'Aceptar'}
                </button>
                <button
                  type="button"
                  className="amistad-rechazar"
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

      <h2 className="ficha-subtitulo">Actividad de tus amigos</h2>
      <DaySelector dias={dias} indiceSeleccionado={indiceDia} onSeleccionar={setIndiceDia} />

      {cargandoFeed ? (
        <p className="app-loading">Cargando actividad...</p>
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
  )
}

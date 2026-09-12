import { useEffect, useState } from 'react'
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  responderSolicitudAmistad,
} from '../lib/api'
import NotificacionCard from '../components/NotificacionCard'
import BackButton from '../components/BackButton'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function Notificaciones() {
  const { signOut } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [marcandoTodas, setMarcandoTodas] = useState(false)

  async function cargarNotificaciones() {
    setCargando(true)
    setError('')
    const { data, error: errNotis } = await getNotificaciones()
    if (errNotis) {
      setError(mensajeError(errNotis, 'No se pudieron cargar las notificaciones.'))
      if (esErrorDeAutenticacion(errNotis)) setTimeout(() => signOut(), 2000)
    } else {
      setNotificaciones(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarNotificaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleMarcarLeida(id) {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    await marcarNotificacionLeida(id)
  }

  async function handleMarcarTodas() {
    setMarcandoTodas(true)
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    await marcarTodasNotificacionesLeidas()
    setMarcandoTodas(false)
  }

  // Tras aceptar/rechazar, la solicitud accionable se borra en el propio
  // trigger de base de datos, así que recargar la lista completa ya basta
  // para que la tarjeta desaparezca y (al volver a Inicio) el contador de
  // la campana se recalcule con datos reales. Si la solicitud ya no
  // estaba disponible (respondida desde otro sitio), no dejamos la
  // pantalla atascada: mostramos un aviso y recargamos igualmente.
  async function handleResponderSolicitud(notificacion, aceptar) {
    setError('')
    const { error: errResponder } = await responderSolicitudAmistad(notificacion.solicitud_amistad_id, aceptar)
    if (errResponder) {
      setError(mensajeError(errResponder, 'Esa solicitud ya no estaba disponible. Se ha actualizado la lista.'))
      if (esErrorDeAutenticacion(errResponder)) setTimeout(() => signOut(), 2000)
    }
    await cargarNotificaciones()
  }

  const hayNoLeidas = notificaciones.some((n) => !n.leida)

  return (
    <div className="app-screen">
      <BackButton />

      <header className="screen-header screen-header--notificaciones">
        <span className="screen-title">Notificaciones</span>
        {hayNoLeidas && (
          <button type="button" className="marcar-todas-btn" onClick={handleMarcarTodas} disabled={marcandoTodas}>
            Marcar todas como leídas
          </button>
        )}
      </header>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <p className="inicio-vacio">No tienes notificaciones</p>
      ) : (
        <div className="notificaciones-lista">
          {notificaciones.map((n) => (
            <NotificacionCard
              key={n.id}
              notificacion={n}
              onMarcarLeida={() => handleMarcarLeida(n.id)}
              onAceptar={() => handleResponderSolicitud(n, true)}
              onRechazar={() => handleResponderSolicitud(n, false)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

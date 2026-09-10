import { useEffect, useState } from 'react'
import { getNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas } from '../lib/api'
import NotificacionCard from '../components/NotificacionCard'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function Notificaciones() {
  const { signOut } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [marcandoTodas, setMarcandoTodas] = useState(false)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: errNotis } = await getNotificaciones()
      if (!activo) return
      if (errNotis) {
        setError(mensajeError(errNotis, 'No se pudieron cargar las notificaciones.'))
        if (esErrorDeAutenticacion(errNotis)) setTimeout(() => signOut(), 2000)
      } else {
        setNotificaciones(data ?? [])
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
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

  const hayNoLeidas = notificaciones.some((n) => !n.leida)

  return (
    <div className="app-screen">
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
            <NotificacionCard key={n.id} notificacion={n} onMarcarLeida={() => handleMarcarLeida(n.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

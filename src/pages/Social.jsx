import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSolicitudesPendientesRecibidas, responderSolicitudAmistad } from '../lib/api'
import PersonaChip from '../components/PersonaChip'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function Social() {
  const { user, signOut } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

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
    </div>
  )
}

import { Link } from 'react-router-dom'
import PersonaChip from './PersonaChip'

function formatearHora(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificacionCard({ notificacion, onMarcarLeida }) {
  const perfilActor = {
    id: notificacion.actor_id,
    nombre: notificacion.actor_nombre,
    nombre_usuario: notificacion.actor_nombre_usuario,
    foto_url: notificacion.actor_foto_url,
  }

  const esNuevoSeguidor = notificacion.tipo === 'nuevo_seguidor'

  const destino = esNuevoSeguidor
    ? null
    : notificacion.evento_id
      ? {
          enlace: `/eventos/${notificacion.evento_id}`,
          texto: notificacion.local_nombre
            ? `${notificacion.evento_nombre} en ${notificacion.local_nombre}`
            : notificacion.evento_nombre,
        }
      : { enlace: `/locales/${notificacion.local_id}`, texto: notificacion.local_nombre }

  return (
    <div
      className={`notificacion-card ${notificacion.leida ? '' : 'notificacion-card--no-leida'}`}
      onClick={() => !notificacion.leida && onMarcarLeida()}
    >
      <PersonaChip perfil={perfilActor} />
      <p className="actividad-destino">
        {esNuevoSeguidor ? (
          'empezó a seguirte'
        ) : (
          <>
            va hoy a <Link to={destino.enlace}>{destino.texto}</Link>
          </>
        )}
      </p>
      <span className="notificacion-hora">{formatearHora(notificacion.creado_en)}</span>
    </div>
  )
}

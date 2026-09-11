import { useState } from 'react'
import { Link } from 'react-router-dom'
import PersonaChip from './PersonaChip'

function formatearHora(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificacionCard({ notificacion, onMarcarLeida, onAceptar, onRechazar }) {
  const [procesando, setProcesando] = useState(false)

  const perfilActor = {
    id: notificacion.actor_id,
    nombre: notificacion.actor_nombre,
    nombre_usuario: notificacion.actor_nombre_usuario,
    foto_url: notificacion.actor_foto_url,
  }

  const esNuevoSeguidor = notificacion.tipo === 'nuevo_seguidor'
  const esSolicitudAmistad = notificacion.tipo === 'solicitud_amistad'
  const esAmistadAceptada = notificacion.tipo === 'amistad_aceptada'
  const esTipoSocial = esNuevoSeguidor || esSolicitudAmistad || esAmistadAceptada

  const destino = esTipoSocial
    ? null
    : notificacion.evento_id
      ? {
          enlace: `/eventos/${notificacion.evento_id}`,
          texto: notificacion.local_nombre
            ? `${notificacion.evento_nombre} en ${notificacion.local_nombre}`
            : notificacion.evento_nombre,
        }
      : { enlace: `/locales/${notificacion.local_id}`, texto: notificacion.local_nombre }

  async function handleAceptar(e) {
    e.stopPropagation()
    setProcesando(true)
    await onAceptar()
    setProcesando(false)
  }

  async function handleRechazar(e) {
    e.stopPropagation()
    setProcesando(true)
    await onRechazar()
    setProcesando(false)
  }

  return (
    <div
      className={`notificacion-card ${notificacion.leida ? '' : 'notificacion-card--no-leida'}`}
      onClick={() => !notificacion.leida && onMarcarLeida()}
    >
      <PersonaChip perfil={perfilActor} />

      <p className="actividad-destino">
        {esNuevoSeguidor && 'empezó a seguirte'}
        {esSolicitudAmistad && 'te ha enviado una solicitud de amistad'}
        {esAmistadAceptada && 'ha aceptado tu solicitud de amistad'}
        {!esTipoSocial && (
          <>
            va hoy a <Link to={destino.enlace}>{destino.texto}</Link>
          </>
        )}
      </p>

      {esSolicitudAmistad && (
        <div className="amistad-respuesta">
          <button type="button" className="amistad-aceptar" onClick={handleAceptar} disabled={procesando}>
            {procesando ? '...' : 'Aceptar'}
          </button>
          <button type="button" className="amistad-rechazar" onClick={handleRechazar} disabled={procesando}>
            {procesando ? '...' : 'Rechazar'}
          </button>
        </div>
      )}

      <span className="notificacion-hora">{formatearHora(notificacion.creado_en)}</span>
    </div>
  )
}

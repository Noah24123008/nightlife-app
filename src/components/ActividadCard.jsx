import { Link } from 'react-router-dom'
import PersonaChip from './PersonaChip'

export default function ActividadCard({ actividad }) {
  const destino = actividad.evento_id
    ? {
        enlace: `/eventos/${actividad.evento_id}`,
        texto: actividad.local_nombre
          ? `${actividad.evento_nombre} en ${actividad.local_nombre}`
          : actividad.evento_nombre,
      }
    : { enlace: `/locales/${actividad.local_id}`, texto: actividad.local_nombre }

  return (
    <div className="actividad-card">
      <PersonaChip
        perfil={{
          id: actividad.usuario_id,
          nombre: actividad.nombre,
          nombre_usuario: actividad.nombre_usuario,
          foto_url: actividad.foto_url,
        }}
      />
      <p className="actividad-destino">
        va hoy a <Link to={destino.enlace}>{destino.texto}</Link>
      </p>
    </div>
  )
}

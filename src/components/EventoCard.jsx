import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import { formatearFechaLarga } from '../lib/dates'

// Igual que en Eventos.jsx: colores clave también inline, con prioridad
// garantizada sobre tokens.css, para que la tarjeta se vea blanca con
// texto oscuro con independencia de la hoja de estilos externa.
const ESTILO_CARD = { background: '#ffffff', color: '#15151a' }
const ESTILO_NOMBRE = { color: '#15151a' }
const ESTILO_METADATA = { color: '#6b6f7a' }

export default function EventoCard({ evento }) {
  return (
    <Link to={`/eventos/${evento.id}`} className="evento-card" style={ESTILO_CARD}>
      <ImagenConFallback
        src={evento.foto_url}
        alt={evento.nombre}
        className="evento-card-foto"
        placeholderClassName="evento-card-foto evento-card-foto--vacia"
      />
      <div className="evento-card-info">
        <p className="evento-card-nombre" style={ESTILO_NOMBRE}>
          {evento.nombre}
        </p>
        {evento.locales?.nombre && (
          <p className="evento-card-local" style={ESTILO_METADATA}>
            {evento.locales.nombre}
          </p>
        )}
        <p className="evento-card-fecha" style={ESTILO_METADATA}>
          {formatearFechaLarga(evento.fecha)}
          {evento.hora_inicio && ` · ${evento.hora_inicio.slice(0, 5)}`}
        </p>
      </div>
    </Link>
  )
}

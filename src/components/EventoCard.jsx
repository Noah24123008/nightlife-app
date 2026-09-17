import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import { formatearFechaLarga } from '../lib/dates'
import { iniciales } from '../lib/iniciales'

// Igual que en Eventos.jsx: colores clave también inline, con prioridad
// garantizada sobre tokens.css, para que la tarjeta se vea blanca con
// texto oscuro con independencia de la hoja de estilos externa.
const ESTILO_CARD = { background: '#ffffff', color: '#15151a' }
const ESTILO_NOMBRE = { color: '#15151a' }
const ESTILO_METADATA = { color: '#6b6f7a' }

// asistenciaSocial es opcional: { totalVan, totalAmigos, amigosMuestra }.
// Si no se pasa, o si no hay ningún asistente, la línea social no se
// renderiza — no queda ningún hueco raro.
export default function EventoCard({ evento, asistenciaSocial }) {
  const { totalVan = 0, totalAmigos = 0, amigosMuestra = [] } = asistenciaSocial ?? {}

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

        {totalVan > 0 && (
          <p className="evento-card-asistencia" style={ESTILO_METADATA}>
            {totalVan} {totalVan === 1 ? 'va' : 'van'}
            {totalAmigos > 0 && (
              <span className="amigos-count-destacado">
                {' '}
                · {totalAmigos} {totalAmigos === 1 ? 'amigo' : 'amigos'}
              </span>
            )}
          </p>
        )}

        {amigosMuestra.length > 0 && (
          <div className="mini-avatares">
            {amigosMuestra.map((perfil) => (
              <span
                key={perfil.usuario_id}
                className="mini-avatar"
                title={perfil.nombre || perfil.nombre_usuario || 'Usuario'}
              >
                <ImagenConFallback
                  src={perfil.foto_url}
                  alt=""
                  placeholderClassName="mini-avatar--vacio"
                  textoAlternativo={iniciales({ nombre: perfil.nombre, nombre_usuario: perfil.nombre_usuario })}
                />
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

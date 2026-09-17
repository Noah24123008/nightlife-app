import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import { iniciales } from '../lib/iniciales'

// subtitulo es opcional: si no se pasa (como en todos los usos existentes
// hasta ahora — Buscar, Social, FichaLocal, notificaciones...), el chip se
// renderiza exactamente igual que antes, con una sola línea de texto.
export default function PersonaChip({ perfil, subtitulo }) {
  const etiqueta = perfil.nombre || (perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : 'Usuario')

  return (
    <Link to={`/usuarios/${perfil.id}`} className="persona-chip">
      <ImagenConFallback
        src={perfil.foto_url}
        alt={etiqueta}
        className="persona-chip-foto"
        placeholderClassName="persona-chip-foto persona-chip-foto--vacia"
        textoAlternativo={iniciales(perfil)}
      />
      {subtitulo ? (
        <span className="persona-chip-texto">
          <span className="persona-chip-nombre">{etiqueta}</span>
          <span className="persona-chip-subtitulo">{subtitulo}</span>
        </span>
      ) : (
        <span className="persona-chip-nombre">{etiqueta}</span>
      )}
    </Link>
  )
}

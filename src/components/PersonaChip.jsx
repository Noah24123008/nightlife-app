import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import { iniciales } from '../lib/iniciales'

// subtitulo es opcional: si no se pasa (como en todos los usos existentes
// hasta ahora — Buscar, Social, FichaLocal, notificaciones...), el chip se
// renderiza exactamente igual que antes, con una sola línea de texto.
export default function PersonaChip({ perfil, subtitulo }) {
  const etiqueta = perfil.nombre || (perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : 'Usuario')

  // Blindaje: si algún caller construye el subtítulo con un valor ausente
  // (p. ej. `@${undefined}`), nunca se muestra un texto roto — se trata
  // como si no hubiera subtítulo. No cambia nada para los usos que ya
  // pasan un subtitulo real (como "Hoy va a X").
  const subtituloSeguro = subtitulo && !/undefined|null/i.test(subtitulo) ? subtitulo : undefined

  return (
    <Link to={`/usuarios/${perfil.id}`} className="persona-chip">
      <ImagenConFallback
        src={perfil.foto_url}
        alt={etiqueta}
        className="persona-chip-foto"
        placeholderClassName="persona-chip-foto persona-chip-foto--vacia"
        textoAlternativo={iniciales(perfil)}
      />
      {subtituloSeguro ? (
        <span className="persona-chip-texto">
          <span className="persona-chip-nombre">{etiqueta}</span>
          <span className="persona-chip-subtitulo">{subtituloSeguro}</span>
        </span>
      ) : (
        <span className="persona-chip-nombre">{etiqueta}</span>
      )}
    </Link>
  )
}

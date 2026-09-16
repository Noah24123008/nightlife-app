import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import { iniciales } from '../lib/iniciales'

export default function PersonaChip({ perfil }) {
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
      <span className="persona-chip-nombre">{etiqueta}</span>
    </Link>
  )
}

import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'

export default function PersonaChip({ perfil, mostrarSigues = false }) {
  const etiqueta = perfil.nombre || (perfil.nombre_usuario ? `@${perfil.nombre_usuario}` : 'Usuario')

  return (
    <Link to={`/usuarios/${perfil.id}`} className="persona-chip">
      <ImagenConFallback
        src={perfil.foto_url}
        alt={etiqueta}
        className="persona-chip-foto"
        placeholderClassName="persona-chip-foto persona-chip-foto--vacia"
      />
      <span className="persona-chip-nombre">{etiqueta}</span>
      {mostrarSigues && perfil.es_seguido && <span className="persona-chip-sigues">Sigues</span>}
    </Link>
  )
}
